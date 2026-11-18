import { Router } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db, auditLogsTable, checkInsTable, eventStaffTable, eventsTable, ordersTable, ticketCategoriesTable, ticketDeliveriesTable, ticketsTable, usersTable } from "@workspace/db";
import { requireRole, type Account } from "../lib/auth";
import { deliverEmail, escapeHtml, sendEmail } from "../lib/email";
import { deliverTicket } from "../lib/tickets";
import { ticketDeliveryEmail } from "../lib/email-templates";

const router = Router();

router.get("/staff/events", requireRole("organiser", "event_staff", "admin"), async (_req, res, next) => {
  try {
    const account = res.locals.account as Account;
    const query = db.select({ id: eventsTable.id }).from(eventsTable);
    const rows = account.role === "admin" ? await query : account.role === "organiser" ? await query.where(eq(eventsTable.organiserId, account.id)) : await db.select({ id: eventsTable.id }).from(eventStaffTable).innerJoin(eventsTable, eq(eventsTable.id, eventStaffTable.eventId)).where(eq(eventStaffTable.userId, account.id));
    const { serializeEvent } = await import("../lib/events");
    res.json(await Promise.all(rows.map((row) => serializeEvent(row.id))));
  } catch (error) { next(error); }
});

router.get("/organiser/events/:eventId/sales", requireRole("organiser", "event_staff", "admin"), async (req, res, next) => {
  try {
    const eventId = z.coerce.number().int().positive().parse(req.params.eventId);
    const account = res.locals.account as Account;
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!event) { res.status(404).json({ error: "Event not found." }); return; }
    if (account.role === "organiser" && event.organiserId !== account.id) { res.status(403).json({ error: "You do not manage this event." }); return; }
    if (account.role === "event_staff") {
      const [assignment] = await db.select().from(eventStaffTable).where(and(eq(eventStaffTable.eventId, eventId), eq(eventStaffTable.userId, account.id))).limit(1);
      if (!assignment) { res.status(403).json({ error: "You are not assigned to this event." }); return; }
    }
    const rows = await db.select({ ticketId: ticketsTable.id, customerId: usersTable.id, customerName: usersTable.name, email: usersTable.email, phone: usersTable.phone, marketingConsent: usersTable.marketingConsent, ticketCategory: ticketCategoriesTable.name, purchasedAt: ordersTable.createdAt, qrToken: ticketsTable.qrToken, ticketStatus: ticketsTable.status, checkedInAt: checkInsTable.scannedAt, price: ticketCategoriesTable.price, orderStatus: ordersTable.status })
      .from(ticketsTable).innerJoin(ordersTable, eq(ticketsTable.orderId, ordersTable.id)).innerJoin(usersTable, eq(ticketsTable.customerId, usersTable.id)).innerJoin(ticketCategoriesTable, eq(ticketsTable.ticketCategoryId, ticketCategoriesTable.id)).leftJoin(checkInsTable, eq(checkInsTable.ticketId, ticketsTable.id)).where(eq(ticketsTable.eventId, eventId));
    const paid = rows.filter((row) => row.orderStatus === "paid" && row.ticketStatus !== "refunded");
    const [revenue] = await db.select({ gross: sql<number>`coalesce(sum(${ordersTable.amount}), 0)` }).from(ordersTable).where(and(eq(ordersTable.eventId, eventId), eq(ordersTable.status, "paid")));
    const deliveryRows = paid.length ? await db.select().from(ticketDeliveriesTable).where(inArray(ticketDeliveriesTable.ticketId, paid.map((row) => row.ticketId))).orderBy(desc(ticketDeliveriesTable.createdAt)) : [];
    const latestDelivery = new Map<number, typeof deliveryRows[number]>();
    for (const delivery of deliveryRows) if (!latestDelivery.has(delivery.ticketId)) latestDelivery.set(delivery.ticketId, delivery);
    res.json({ eventId, ticketsSold: paid.length, grossRevenue: Number(revenue?.gross ?? 0), attendees: paid.map((row) => ({ id: row.ticketId, customerId: row.customerId, name: row.customerName, email: row.email, phone: row.phone, marketingConsent: row.marketingConsent, ticketCategory: row.ticketCategory, purchasedAt: row.purchasedAt, ticketReference: row.qrToken, paymentStatus: row.orderStatus, deliveryStatus: latestDelivery.get(row.ticketId)?.status ?? "not_sent", checkedIn: Boolean(row.checkedInAt), checkedInAt: row.checkedInAt, ticketStatus: row.ticketStatus })) });
  } catch (error) { next(error); }
});

router.get("/organiser/events/:eventId/check-ins", requireRole("organiser", "event_staff", "admin"), async (req, res, next) => {
  try {
    const eventId = z.coerce.number().int().positive().parse(req.params.eventId);
    const account = res.locals.account as Account;
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!event) { res.status(404).json({ error: "Event not found." }); return; }
    if (account.role === "organiser" && event.organiserId !== account.id) { res.status(403).json({ error: "You do not manage this event." }); return; }
    if (account.role === "event_staff") {
      const [assignment] = await db.select().from(eventStaffTable).where(and(eq(eventStaffTable.eventId, eventId), eq(eventStaffTable.userId, account.id))).limit(1);
      if (!assignment) { res.status(403).json({ error: "You are not assigned to this event." }); return; }
    }
    const staff = alias(usersTable, "staff");
    const rows = await db.select({ ticketReference: ticketsTable.qrToken, attendeeName: usersTable.name, category: ticketCategoriesTable.name, scannedAt: checkInsTable.scannedAt, staffName: staff.name }).from(checkInsTable).innerJoin(ticketsTable, eq(checkInsTable.ticketId, ticketsTable.id)).innerJoin(usersTable, eq(ticketsTable.customerId, usersTable.id)).innerJoin(ticketCategoriesTable, eq(ticketsTable.ticketCategoryId, ticketCategoriesTable.id)).innerJoin(staff, eq(checkInsTable.scannedBy, staff.id)).where(eq(checkInsTable.eventId, eventId)).orderBy(sql`${checkInsTable.scannedAt} desc`).limit(100);
    res.json(rows);
  } catch (error) { next(error); }
});

router.get("/tickets", requireRole("customer", "organiser"), async (_req, res, next) => {
  try {
    const account = res.locals.account as Account;
    const rows = await db.select({ ticket: ticketsTable, event: eventsTable, category: ticketCategoriesTable, order: ordersTable }).from(ticketsTable).innerJoin(eventsTable, eq(ticketsTable.eventId, eventsTable.id)).innerJoin(ticketCategoriesTable, eq(ticketsTable.ticketCategoryId, ticketCategoriesTable.id)).innerJoin(ordersTable, eq(ticketsTable.orderId, ordersTable.id)).where(and(eq(ticketsTable.customerId, account.id), eq(ordersTable.status, "paid")));
    const deliveryRows = rows.length ? await db.select().from(ticketDeliveriesTable).where(inArray(ticketDeliveriesTable.ticketId, rows.map((row) => row.ticket.id))).orderBy(desc(ticketDeliveriesTable.createdAt)) : [];
    const latestDelivery = new Map<number, typeof deliveryRows[number]>();
    for (const delivery of deliveryRows) if (!latestDelivery.has(delivery.ticketId)) latestDelivery.set(delivery.ticketId, delivery);
    res.json(rows.map((row) => ({ id: row.ticket.id, eventId: row.event.id, eventTitle: row.event.title, venue: row.event.venue, city: row.event.city, imageUrl: row.event.imageUrl, startsAt: row.event.startsAt, ticketCategory: row.category.name, reference: row.ticket.qrToken, status: row.ticket.status, deliveryStatus: latestDelivery.get(row.ticket.id)?.status ?? "not_sent", purchaseDate: row.order.createdAt })));
  } catch (error) { next(error); }
});

async function ticketRecord(ticketId: number) {
  const [row] = await db.select({ ticket: ticketsTable, event: eventsTable, category: ticketCategoriesTable, order: ordersTable, customer: usersTable }).from(ticketsTable).innerJoin(eventsTable, eq(ticketsTable.eventId, eventsTable.id)).innerJoin(ticketCategoriesTable, eq(ticketsTable.ticketCategoryId, ticketCategoriesTable.id)).innerJoin(ordersTable, eq(ticketsTable.orderId, ordersTable.id)).innerJoin(usersTable, eq(ticketsTable.customerId, usersTable.id)).where(eq(ticketsTable.id, ticketId)).limit(1);
  return row;
}

async function canAccessTicket(account: Account, row: Awaited<ReturnType<typeof ticketRecord>>) {
  if (!row) return false;
  if (account.role === "admin") return true;
  if (account.role === "customer") return row.ticket.customerId === account.id;
  if (account.role === "organiser") return row.event.organiserId === account.id;
  return false;
}

router.get("/tickets/:ticketId/delivery-history", requireRole("customer", "organiser", "admin"), async (req, res, next) => {
  try {
    const ticketId = z.coerce.number().int().positive().parse(req.params.ticketId);
    const account = res.locals.account as Account;
    const row = await ticketRecord(ticketId);
    if (!row) { res.status(404).json({ error: "Ticket not found." }); return; }
    if (!await canAccessTicket(account, row)) { res.status(403).json({ error: "You cannot view this ticket's delivery history." }); return; }
    const rows = await db.select({ id: ticketDeliveriesTable.id, recipient: ticketDeliveriesTable.recipient, status: ticketDeliveriesTable.status, providerMessageId: ticketDeliveriesTable.providerMessageId, error: ticketDeliveriesTable.error, createdAt: ticketDeliveriesTable.createdAt }).from(ticketDeliveriesTable).where(eq(ticketDeliveriesTable.ticketId, ticketId)).orderBy(desc(ticketDeliveriesTable.createdAt));
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/tickets/:ticketId/resend", requireRole("customer", "organiser", "admin"), async (req, res, next) => {
  try {
    const ticketId = z.coerce.number().int().positive().parse(req.params.ticketId);
    const account = res.locals.account as Account;
    const row = await ticketRecord(ticketId);
    if (!row) { res.status(404).json({ error: "Ticket not found." }); return; }
    if (!await canAccessTicket(account, row)) { res.status(403).json({ error: "You cannot resend this ticket." }); return; }
    if (row.ticket.status === "refunded" || row.ticket.status === "cancelled") { res.status(409).json({ error: "This ticket is no longer valid and cannot be delivered." }); return; }
    const result = await deliverTicket(ticketId, account.id);
    if (result.status === "sent") {
      res.json({ status: result.status, recipient: result.recipient, createdAt: result.createdAt });
    } else {
      res.status(result.status === "provider_not_configured" ? 503 : 502).json({ status: result.status, error: result.error });
    }
  } catch (error) { next(error); }
});

router.post("/check-in/scan", requireRole("organiser", "event_staff", "admin"), async (req, res, next) => {
  try {
    const input = z.object({ eventId: z.number().int().positive(), qrToken: z.string().min(16).max(200) }).parse(req.body);
    const account = res.locals.account as Account;
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, input.eventId)).limit(1);
    if (!event) { res.status(404).json({ result: "invalid", message: "Event not found.", eventTitle: null, scannedAt: null }); return; }
    if (account.role === "organiser" && event.organiserId !== account.id) { res.status(403).json({ error: "You do not manage this event." }); return; }
    if (account.role === "event_staff") {
      const [assignment] = await db.select().from(eventStaffTable).where(and(eq(eventStaffTable.eventId, input.eventId), eq(eventStaffTable.userId, account.id))).limit(1);
      if (!assignment) { res.status(403).json({ error: "You are not assigned to this event." }); return; }
    }
    const [ticket] = await db.select().from(ticketsTable).where(and(eq(ticketsTable.eventId, input.eventId), eq(ticketsTable.qrToken, input.qrToken))).limit(1);
    if (!ticket) { res.json({ result: "invalid", message: "Ticket is not valid for this event.", eventTitle: event.title, scannedAt: null }); return; }
    const [existing] = await db.select().from(checkInsTable).where(eq(checkInsTable.ticketId, ticket.id)).limit(1);
    if (existing) { res.json({ result: "already_used", message: "This ticket has already been checked in.", eventTitle: event.title, scannedAt: existing.scannedAt }); return; }
    if (ticket.status !== "valid") { res.json({ result: "invalid", message: "This ticket is no longer valid.", eventTitle: event.title, scannedAt: null }); return; }
    const scannedAt = new Date();
    try {
      await db.transaction(async (tx) => {
        await tx.insert(checkInsTable).values({ ticketId: ticket.id, eventId: input.eventId, scannedBy: account.id, scannedAt });
        await tx.update(ticketsTable).set({ status: "checked_in" }).where(eq(ticketsTable.id, ticket.id));
        await tx.insert(auditLogsTable).values({ actorId: account.id, action: "ticket_check_in", entityType: "ticket", entityId: String(ticket.id), details: { eventId: input.eventId } });
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") { res.json({ result: "already_used", message: "This ticket has already been checked in.", eventTitle: event.title, scannedAt: new Date() }); return; }
      throw error;
    }
    res.json({ result: "valid", message: "Ticket is valid. Check-in recorded.", eventTitle: event.title, scannedAt });
  } catch (error) { next(error); }
});

export default router;
