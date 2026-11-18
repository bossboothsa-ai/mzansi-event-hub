import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { and, eq, gt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, eventsTable, ordersTable, organiserPaymentSettingsTable, paymentsTable, ticketCategoriesTable, ticketsTable } from "@workspace/db";
import { requireRole, type Account } from "../lib/auth";
import { decryptSecret } from "../lib/payfast";
import { deliverTicket } from "../lib/tickets";
import { logger } from "../lib/logger";

const router = Router();

function signature(values: Record<string, string>, passphrase: string): string {
  const fields = Object.entries(values).filter(([key, value]) => key !== "signature" && value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value.trim())}`).join("&");
  return createHash("md5").update(`${fields}&passphrase=${encodeURIComponent(passphrase.trim())}`).digest("hex");
}

function sameSignature(left: string, right: string): boolean {
  const a = Buffer.from(left.toLowerCase()); const b = Buffer.from(right.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

router.post("/checkout", requireRole("customer", "organiser"), async (req, res, next) => {
  try {
    const input = z.object({ eventId: z.number().int().positive(), ticketCategoryId: z.number().int().positive(), quantity: z.number().int().min(1).max(8) }).parse(req.body);
    const account = res.locals.account as Account;
    const [event] = await db.select().from(eventsTable).where(and(eq(eventsTable.id, input.eventId), eq(eventsTable.status, "published"))).limit(1);
    if (!event || event.startsAt <= new Date()) { res.status(404).json({ error: "This event is not available for ticket sales." }); return; }
    const [category] = await db.select().from(ticketCategoriesTable).where(and(eq(ticketCategoriesTable.id, input.ticketCategoryId), eq(ticketCategoriesTable.eventId, event.id))).limit(1);
    if (!category) { res.status(404).json({ error: "Ticket category not found." }); return; }
    const now = new Date();
    if (category.salesStart && category.salesStart > now || category.salesEnd && category.salesEnd < now) { res.status(409).json({ error: "Ticket sales are not open for this category." }); return; }
    const [settings] = await db.select().from(organiserPaymentSettingsTable).where(eq(organiserPaymentSettingsTable.organiserId, event.organiserId)).limit(1);
    const notifyUrl = process.env.PAYFAST_NOTIFY_URL;
    if (!settings || !notifyUrl) { res.status(503).json({ error: "Ticket checkout is not configured yet. The event organiser must connect PayFast and the platform must provide a public ITN URL." }); return; }

    const reference = `MZEH-${randomBytes(16).toString("hex").toUpperCase()}`;
    const amount = Number(category.price) * input.quantity;
    const order = await db.transaction(async (tx) => {
      const [lockedCategory] = await tx.select().from(ticketCategoriesTable).where(eq(ticketCategoriesTable.id, category.id)).for("update").limit(1);
      if (!lockedCategory) throw Object.assign(new Error("Ticket category is no longer available."), { status: 409 });
      const reservationCutoff = new Date(Date.now() - 15 * 60 * 1000);
      const [reserved] = await tx.select({ quantity: sql<number>`coalesce(sum(${ordersTable.quantity}), 0)` }).from(ordersTable)
        .where(and(eq(ordersTable.ticketCategoryId, category.id), or(eq(ordersTable.status, "paid"), and(eq(ordersTable.status, "pending"), gt(ordersTable.createdAt, reservationCutoff)))));
      if (Number(reserved?.quantity ?? 0) + input.quantity > lockedCategory.quantity) throw Object.assign(new Error("There are not enough tickets available in this category."), { status: 409 });
      const [created] = await tx.insert(ordersTable).values({ checkoutReference: reference, eventId: event.id, ticketCategoryId: category.id, organiserId: event.organiserId, customerId: account.id, quantity: input.quantity, amount, status: "pending" }).returning();
      await tx.insert(paymentsTable).values({ orderId: created.id, provider: "payfast_sandbox", amount, status: "pending" });
      return created;
    });

    const passphrase = decryptSecret(settings.encryptedPassphrase);
    const merchantKey = decryptSecret(settings.encryptedMerchantKey);
    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:8000";
    const fields: Record<string, string> = {
      merchant_id: settings.sandboxMerchantId,
      merchant_key: merchantKey,
      return_url: `${webOrigin}/account/tickets`,
      cancel_url: `${webOrigin}/events/${event.id}`,
      notify_url: notifyUrl,
      m_payment_id: order.checkoutReference,
      amount: amount.toFixed(2),
      item_name: event.title.slice(0, 100),
      item_description: category.name.slice(0, 255),
      email_address: account.email,
    };
    fields.signature = signature(fields, passphrase);
    res.status(201).json({ action: "https://sandbox.payfast.co.za/eng/process", fields, orderReference: order.checkoutReference });
  } catch (error) { next(error); }
});

router.post("/payments/payfast/itn", async (req, res, next) => {
  try {
    const payload = z.record(z.string(), z.string()).safeParse(req.body);
    if (!payload.success) { res.status(400).send("INVALID"); return; }
    const body = payload.data;
    const reference = body.m_payment_id;
    if (!reference || !body.signature || !body.pf_payment_id || !body.payment_status) { res.status(400).send("INVALID"); return; }
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.checkoutReference, reference)).limit(1);
    if (!order) { res.status(404).send("INVALID"); return; }
    const [settings] = await db.select().from(organiserPaymentSettingsTable).where(eq(organiserPaymentSettingsTable.organiserId, order.organiserId)).limit(1);
    if (!settings || body.merchant_id !== settings.sandboxMerchantId) { res.status(400).send("INVALID"); return; }
    const passphrase = decryptSecret(settings.encryptedPassphrase);
    if (!sameSignature(body.signature, signature(body, passphrase))) { res.status(400).send("INVALID"); return; }
    if (Number(body.amount_gross).toFixed(2) !== Number(order.amount).toFixed(2)) { res.status(400).send("INVALID"); return; }

    const verification = await fetch("https://sandbox.payfast.co.za/eng/query/validate", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body), signal: AbortSignal.timeout(10_000),
    });
    if (!verification.ok || (await verification.text()).trim() !== "VALID") { res.status(400).send("INVALID"); return; }

    let deliveredTickets: number[] = [];
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(ordersTable).where(eq(ordersTable.id, order.id)).for("update").limit(1);
      if (!locked || locked.status === "paid") return;
      const paid = body.payment_status === "COMPLETE";
      await tx.update(ordersTable).set({ status: paid ? "paid" : body.payment_status === "CANCELLED" ? "cancelled" : "failed" }).where(eq(ordersTable.id, order.id));
      await tx.update(paymentsTable).set({ providerPaymentId: body.pf_payment_id, status: paid ? "verified" : body.payment_status.toLowerCase(), notification: body, verifiedAt: paid ? new Date() : null }).where(eq(paymentsTable.orderId, order.id));
      if (paid) {
        const tickets = Array.from({ length: order.quantity }, () => ({ orderId: order.id, eventId: order.eventId, ticketCategoryId: order.ticketCategoryId, customerId: order.customerId, qrToken: randomBytes(24).toString("base64url"), status: "valid" }));
        const inserted = await tx.insert(ticketsTable).values(tickets).returning({ id: ticketsTable.id });
        deliveredTickets = inserted.map(t => t.id);
      }
    });
    for (const ticketId of deliveredTickets) {
      try {
        await deliverTicket(ticketId);
      } catch (error) {
        logger.error({ err: error, ticketId }, "Auto ticket delivery failed after payment");
      }
    }
    res.status(200).send("OK");
  } catch (error) { next(error); }
});

export default router;
