import { Router } from "express";
import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { raw } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, auditLogsTable, eventCommunicationsTable, eventsTable, onboardingFeeSettingsTable, organiserApplicationMessagesTable, organiserApplicationsTable, organiserPaymentSettingsTable, ordersTable, ticketCategoriesTable, usersTable, verificationDocumentsTable } from "@workspace/db";
import { requireRole, requireUser, type Account } from "../lib/auth";
import { serializeEvent } from "../lib/events";
import { EmailConfigurationError, deliverEmail, escapeHtml } from "../lib/email";
import { applicationDecisionEmail, onboardingPaymentConfirmedEmail } from "../lib/email-templates";

const router = Router();
const documentTypes = ["application/pdf", "image/jpeg", "image/png"];

function encryptSecret(value: string): string {
  const secret = process.env.PAYFAST_ENCRYPTION_SECRET;
  if (!secret) throw Object.assign(new Error("PayFast credential encryption is not configured."), { status: 503 });
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":");
}
const eventInput = z.object({
  title: z.string().trim().min(4).max(120), description: z.string().trim().min(20).max(8000),
  city: z.string().trim().min(2).max(100), venue: z.string().trim().min(2).max(200),
  startsAt: z.coerce.date(), category: z.string().trim().min(2).max(100), imageUrl: z.string().url().nullable(),
  authenticityAccepted: z.boolean(), organiserTermsAccepted: z.boolean(), submitForReview: z.boolean(),
  ticketCategories: z.array(z.object({ name: z.string().trim().min(1).max(100), description: z.string().max(1000), price: z.number().min(0), quantityAvailable: z.number().int().min(1), salesStart: z.coerce.date().nullable(), salesEnd: z.coerce.date().nullable() })).min(1),
});

async function getEvent(eventId: number) { return serializeEvent(eventId); }

router.get("/organiser/application", requireUser, async (_req, res, next) => {
  try {
    const account = res.locals.account as Account;
    const [application] = await db.select().from(organiserApplicationsTable).where(eq(organiserApplicationsTable.userId, account.id)).limit(1);
    if (!application) { res.status(404).json({ error: "No organiser application has been submitted." }); return; }
    res.json(application);
  } catch (error) { next(error); }
});

router.get("/organiser/onboarding-fee", requireUser, async (_req, res, next) => {
  try {
    const [fee] = await db.select().from(onboardingFeeSettingsTable).where(eq(onboardingFeeSettingsTable.key, "organiser_onboarding_fee")).limit(1);
    res.json({ amount: fee?.amount ?? 0, currency: "ZAR", cadence: "once_off" });
  } catch (error) { next(error); }
});

router.get("/organiser/application/messages", requireUser, async (_req, res, next) => {
  try {
    const account = res.locals.account as Account;
    const [application] = await db.select({ id: organiserApplicationsTable.id }).from(organiserApplicationsTable).where(eq(organiserApplicationsTable.userId, account.id)).limit(1);
    if (!application) { res.status(404).json({ error: "No organiser application has been submitted." }); return; }
    const rows = await db.select({ id: organiserApplicationMessagesTable.id, content: organiserApplicationMessagesTable.content, senderId: organiserApplicationMessagesTable.senderId, senderName: usersTable.name, senderRole: usersTable.role, createdAt: organiserApplicationMessagesTable.createdAt }).from(organiserApplicationMessagesTable).innerJoin(usersTable, eq(organiserApplicationMessagesTable.senderId, usersTable.id)).where(eq(organiserApplicationMessagesTable.applicationId, application.id)).orderBy(asc(organiserApplicationMessagesTable.createdAt));
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/organiser/application/messages", requireUser, async (req, res, next) => {
  try {
    const body = z.object({ content: z.string().trim().min(1).max(4000) }).parse(req.body);
    const account = res.locals.account as Account;
    const [application] = await db.select({ id: organiserApplicationsTable.id }).from(organiserApplicationsTable).where(eq(organiserApplicationsTable.userId, account.id)).limit(1);
    if (!application) { res.status(404).json({ error: "No organiser application has been submitted." }); return; }
    const [message] = await db.insert(organiserApplicationMessagesTable).values({ applicationId: application.id, senderId: account.id, content: body.content }).returning();
    res.status(201).json({ ...message, senderName: account.name, senderRole: account.role });
  } catch (error) { next(error); }
});

router.get("/admin/applications/:applicationId/messages", requireRole("admin"), async (req, res, next) => {
  try {
    const applicationId = z.coerce.number().int().positive().parse(req.params.applicationId);
    const rows = await db.select({ id: organiserApplicationMessagesTable.id, content: organiserApplicationMessagesTable.content, senderId: organiserApplicationMessagesTable.senderId, senderName: usersTable.name, senderRole: usersTable.role, createdAt: organiserApplicationMessagesTable.createdAt }).from(organiserApplicationMessagesTable).innerJoin(usersTable, eq(organiserApplicationMessagesTable.senderId, usersTable.id)).where(eq(organiserApplicationMessagesTable.applicationId, applicationId)).orderBy(asc(organiserApplicationMessagesTable.createdAt));
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/admin/applications/:applicationId/messages", requireRole("admin"), async (req, res, next) => {
  try {
    const applicationId = z.coerce.number().int().positive().parse(req.params.applicationId);
    const body = z.object({ content: z.string().trim().min(1).max(4000) }).parse(req.body);
    const [application] = await db.select({ id: organiserApplicationsTable.id }).from(organiserApplicationsTable).where(eq(organiserApplicationsTable.id, applicationId)).limit(1);
    if (!application) { res.status(404).json({ error: "Organiser application not found." }); return; }
    const account = res.locals.account as Account;
    const [message] = await db.transaction(async (tx) => {
      const inserted = await tx.insert(organiserApplicationMessagesTable).values({ applicationId, senderId: account.id, content: body.content }).returning();
      await tx.insert(auditLogsTable).values({ actorId: account.id, action: "application_message", entityType: "organiser_application", entityId: String(applicationId), details: { messageId: inserted[0].id } });
      return inserted;
    });
    res.status(201).json({ ...message, senderName: account.name, senderRole: account.role });
  } catch (error) { next(error); }
});

router.get("/admin/application-messages", requireRole("admin"), async (_req, res, next) => {
  try {
    const rows = await db.select({ id: organiserApplicationMessagesTable.id, applicationId: organiserApplicationMessagesTable.applicationId, organisationName: organiserApplicationsTable.organisationName, content: organiserApplicationMessagesTable.content, senderId: organiserApplicationMessagesTable.senderId, senderName: usersTable.name, senderRole: usersTable.role, createdAt: organiserApplicationMessagesTable.createdAt }).from(organiserApplicationMessagesTable).innerJoin(organiserApplicationsTable, eq(organiserApplicationMessagesTable.applicationId, organiserApplicationsTable.id)).innerJoin(usersTable, eq(organiserApplicationMessagesTable.senderId, usersTable.id)).orderBy(asc(organiserApplicationMessagesTable.createdAt));
    res.json(rows);
  } catch (error) { next(error); }
});

router.post("/organiser/application", requireUser, async (req, res, next) => {
  try {
    const body = z.object({ accountType: z.enum(["individual", "business"]), legalName: z.string().trim().min(2).max(160), contactEmail: z.string().email(), phone: z.string().min(7).max(40), organisationName: z.string().trim().min(2).max(160), city: z.string().trim().min(2).max(100), registrationNumber: z.string().nullable(), identityDocumentPath: z.string().uuid().nullable().optional(), businessDocumentPath: z.string().uuid().nullable().optional(), authenticityAccepted: z.literal(true), agreementAccepted: z.literal(true) }).parse(req.body);
    const account = res.locals.account as Account;
    const [existing] = await db.select().from(organiserApplicationsTable).where(eq(organiserApplicationsTable.userId, account.id)).limit(1);
    if (existing && !["rejected", "more_information_required"].includes(existing.status)) { res.status(409).json({ error: "This account already has an application in progress or approved. Continue with your existing application." }); return; }
    const [identityDocument] = body.identityDocumentPath ? await db.select().from(verificationDocumentsTable).where(and(eq(verificationDocumentsTable.id, body.identityDocumentPath), eq(verificationDocumentsTable.ownerId, account.id), eq(verificationDocumentsTable.kind, "identity"))).limit(1) : [];
    const [businessDocument] = body.businessDocumentPath ? await db.select().from(verificationDocumentsTable).where(and(eq(verificationDocumentsTable.id, body.businessDocumentPath), eq(verificationDocumentsTable.ownerId, account.id), eq(verificationDocumentsTable.kind, "business"))).limit(1) : [];
    if (!identityDocument || body.accountType === "business" && !businessDocument) { res.status(400).json({ error: "Upload the required verification documents before submitting." }); return; }
    const [application] = existing
      ? await db.update(organiserApplicationsTable).set({ ...body, status: "pending", paymentStatus: "pending", reviewNote: null, createdAt: new Date() }).where(eq(organiserApplicationsTable.userId, account.id)).returning()
      : await db.insert(organiserApplicationsTable).values({ userId: account.id, ...body, status: "pending", paymentStatus: "pending" }).returning();
    res.status(201).json(application);
  } catch (error) { next(error); }
});

router.post("/organiser/documents", requireUser, raw({ type: documentTypes, limit: "10mb" }), async (req, res, next) => {
  try {
    const account = res.locals.account as Account;
    const kind = z.enum(["identity", "business"]).parse(req.query.kind);
    const mimeType = req.is(documentTypes);
    const fileName = z.string().min(1).max(255).parse(decodeURIComponent(String(req.header("x-file-name") ?? "document")));
    const body = Buffer.isBuffer(req.body) ? req.body : null;
    if (!mimeType || !body?.length) { res.status(400).json({ error: "Upload a PDF, JPG or PNG document." }); return; }
    const id = randomUUID();
    const storageKey = randomUUID();
    const root = path.resolve(process.env.PRIVATE_DOCUMENTS_DIR ?? path.join(process.cwd(), "private-documents"));
    await mkdir(root, { recursive: true });
    await writeFile(path.join(root, storageKey), body, { flag: "wx", mode: 0o600 });
    await db.insert(verificationDocumentsTable).values({ id, ownerId: account.id, kind, fileName, mimeType, storageKey });
    res.status(201).json({ id, kind, fileName, status: "uploaded_private" });
  } catch (error) { next(error); }
});

router.get("/organiser/payfast", requireRole("organiser"), async (_req, res, next) => {
  try {
    const account = res.locals.account as Account;
    const [settings] = await db.select({ merchantId: organiserPaymentSettingsTable.sandboxMerchantId }).from(organiserPaymentSettingsTable).where(eq(organiserPaymentSettingsTable.organiserId, account.id)).limit(1);
    res.json({ configured: Boolean(settings), environment: "sandbox", livePaymentsEnabled: false, merchantId: settings?.merchantId ?? null });
  } catch (error) { next(error); }
});

router.put("/organiser/payfast", requireRole("organiser"), async (req, res, next) => {
  try {
    const body = z.object({ sandboxMerchantId: z.string().trim().min(1).max(100), sandboxMerchantKey: z.string().min(1).max(500), sandboxPassphrase: z.string().min(1).max(500) }).parse(req.body);
    const account = res.locals.account as Account;
    await db.insert(organiserPaymentSettingsTable).values({ organiserId: account.id, sandboxMerchantId: body.sandboxMerchantId, encryptedMerchantKey: encryptSecret(body.sandboxMerchantKey), encryptedPassphrase: encryptSecret(body.sandboxPassphrase) }).onConflictDoUpdate({ target: organiserPaymentSettingsTable.organiserId, set: { sandboxMerchantId: body.sandboxMerchantId, encryptedMerchantKey: encryptSecret(body.sandboxMerchantKey), encryptedPassphrase: encryptSecret(body.sandboxPassphrase), updatedAt: new Date() } });
    res.json({ configured: true, environment: "sandbox", livePaymentsEnabled: false, merchantId: body.sandboxMerchantId });
  } catch (error) { next(error); }
});

router.get("/organiser/events/:eventId/communications", requireRole("organiser", "admin"), async (req, res, next) => {
  try {
    const eventId = z.coerce.number().int().positive().parse(req.params.eventId);
    const account = res.locals.account as Account;
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!event) { res.status(404).json({ error: "Event not found." }); return; }
    if (account.role === "organiser" && event.organiserId !== account.id) { res.status(403).json({ error: "You do not manage this event." }); return; }
    const messages = await db.select().from(eventCommunicationsTable).where(eq(eventCommunicationsTable.eventId, eventId)).orderBy(asc(eventCommunicationsTable.createdAt));
    res.json(messages);
  } catch (error) { next(error); }
});

router.post("/organiser/events/:eventId/communications", requireRole("organiser"), async (req, res, next) => {
  try {
    const eventId = z.coerce.number().int().positive().parse(req.params.eventId);
    const body = z.object({ category: z.enum(["Ticket confirmation", "Event announcement", "Venue changes", "Event postponement", "Event cancellation", "Event-day reminders", "General customer communication", "Marketing update"]), audience: z.enum(["All ticket holders", "VIP ticket holders", "General ticket holders", "Specific customers"]), customerIds: z.array(z.string().uuid()).optional(), subject: z.string().trim().min(1).max(200), content: z.string().trim().min(1).max(10000) }).parse(req.body);
    const account = res.locals.account as Account;
    const [event] = await db.select().from(eventsTable).where(and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, account.id))).limit(1);
    if (!event) { res.status(404).json({ error: "Event not found." }); return; }
    const transactional = ["Ticket confirmation", "Venue changes", "Event postponement", "Event cancellation", "Event-day reminders"].includes(body.category);
    const purchases = await db.select({ userId: usersTable.id, name: usersTable.name, email: usersTable.email, category: ticketCategoriesTable.name, marketingConsent: usersTable.marketingConsent }).from(ordersTable).innerJoin(usersTable, eq(ordersTable.customerId, usersTable.id)).innerJoin(ticketCategoriesTable, eq(ordersTable.ticketCategoryId, ticketCategoriesTable.id)).where(and(eq(ordersTable.eventId, eventId), eq(ordersTable.status, "paid")));
    const filtered = purchases.filter((buyer) => {
      const audienceMatch = body.audience === "All ticket holders" || body.audience === "VIP ticket holders" && buyer.category.toLowerCase().includes("vip") || body.audience === "General ticket holders" && !buyer.category.toLowerCase().includes("vip") || body.audience === "Specific customers" && body.customerIds?.includes(buyer.userId);
      return audienceMatch && (transactional || buyer.marketingConsent);
    });
    const distinct = [...new Map(filtered.map((buyer) => [buyer.userId, buyer])).values()];
    if (!distinct.length) { res.status(400).json({ error: "There are no eligible recipients for this message." }); return; }
    const [message] = await db.transaction(async (tx) => {
      const [created] = await tx.insert(eventCommunicationsTable).values({ eventId, senderId: account.id, category: body.category, audience: body.audience, subject: body.subject, content: body.content, recipients: distinct.map(({ userId, email, name, category }) => ({ userId, email, name, ticketCategory: category })), recipientCount: distinct.length, transactional, status: "queued" }).returning();
      await tx.insert(auditLogsTable).values({ actorId: account.id, action: "queue_customer_communication", entityType: "event_communication", entityId: String(created.id), details: { eventId, recipientCount: distinct.length, transactional } });
      return [created];
    });
    const delivered: NonNullable<typeof message.recipients> = [];
    let configurationMissing = false;
    for (const recipient of distinct) {
      const result = await deliverEmail({ to: recipient.email, subject: body.subject, idempotencyKey: `event-message-${message.id}-${recipient.userId}`, html: `<main><h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(body.content).replaceAll("\n", "<br>")}</p><hr><small>${transactional ? "Event update" : "Marketing message sent with your consent"}. Manage your email preferences from your account settings.</small></main>`, entityType: "event_communication", entityId: String(message.id) });
      if (result.status === "provider_not_configured") configurationMissing = true;
      delivered.push({ userId: recipient.userId, email: recipient.email, name: recipient.name, ticketCategory: recipient.category, deliveryStatus: result.status, providerMessageId: result.id, error: result.error });
    }
    const successCount = delivered.filter((recipient) => recipient.deliveryStatus === "sent").length;
    const status = configurationMissing ? "provider_not_configured" : successCount === delivered.length ? "sent" : successCount ? "partially_sent" : "failed";
    const [updated] = await db.update(eventCommunicationsTable).set({ recipients: delivered, status }).where(eq(eventCommunicationsTable.id, message.id)).returning();
    await db.insert(auditLogsTable).values({ actorId: account.id, action: "deliver_customer_communication", entityType: "event_communication", entityId: String(message.id), details: { recipientCount: delivered.length, delivered: successCount, status } });
    res.status(201).json(updated);
  } catch (error) { next(error); }
});

router.get("/organiser/dashboard", requireRole("organiser", "admin"), async (_req, res, next) => {
  try {
    const account = res.locals.account as Account;
    const [application] = await db.select().from(organiserApplicationsTable).where(eq(organiserApplicationsTable.userId, account.id)).limit(1);
    const rows = await db.select().from(eventsTable).where(eq(eventsTable.organiserId, account.id));
    const [sales] = await db.select({ ticketsSold: sql<number>`coalesce(sum(${ordersTable.quantity}), 0)`, revenue: sql<number>`coalesce(sum(${ordersTable.amount}), 0)` }).from(ordersTable).where(and(eq(ordersTable.organiserId, account.id), eq(ordersTable.status, "paid")));
    res.json({ status: application?.status ?? "not_started", paymentStatus: application?.paymentStatus ?? "not_due", eventCount: rows.length, ticketsSold: Number(sales?.ticketsSold ?? 0), revenue: Number(sales?.revenue ?? 0), events: await Promise.all(rows.map((event) => getEvent(event.id))) });
  } catch (error) { next(error); }
});

router.get("/organiser/events", requireRole("organiser", "admin"), async (_req, res, next) => {
  try {
    const account = res.locals.account as Account;
    const rows = await db.select({ id: eventsTable.id }).from(eventsTable).where(eq(eventsTable.organiserId, account.id)).orderBy(asc(eventsTable.startsAt));
    res.json(await Promise.all(rows.map((row) => getEvent(row.id))));
  } catch (error) { next(error); }
});

router.post("/organiser/events", requireRole("organiser"), async (req, res, next) => {
  try {
    const input = eventInput.parse(req.body);
    if (input.submitForReview && (!input.authenticityAccepted || !input.organiserTermsAccepted)) { res.status(400).json({ error: "Accept the event declarations before submission." }); return; }
    const account = res.locals.account as Account;
    const [application] = await db.select().from(organiserApplicationsTable).where(eq(organiserApplicationsTable.userId, account.id)).limit(1);
    if (application?.status !== "approved" || !["paid", "waived"].includes(application.paymentStatus)) { res.status(403).json({ error: "Organiser approval and the onboarding fee must be complete before event creation." }); return; }
    const [event] = await db.transaction(async (tx) => {
      const [created] = await tx.insert(eventsTable).values({ organiserId: account.id, title: input.title, description: input.description, city: input.city, venue: input.venue, startsAt: input.startsAt, category: input.category, imageUrl: input.imageUrl, authenticityAccepted: input.authenticityAccepted, organiserTermsAccepted: input.organiserTermsAccepted, status: input.submitForReview ? "pending" : "draft" }).returning();
      await tx.insert(ticketCategoriesTable).values(input.ticketCategories.map((category) => ({ eventId: created.id, name: category.name, description: category.description, price: category.price, quantity: category.quantityAvailable, salesStart: category.salesStart, salesEnd: category.salesEnd })));
      return [created];
    });
    const result = await getEvent(event.id);
    res.status(201).json(result);
  } catch (error) { next(error); }
});

router.patch("/organiser/events/:eventId", requireRole("organiser"), async (req, res, next) => {
  try {
    const eventId = z.coerce.number().int().positive().parse(req.params.eventId);
    const input = eventInput.parse(req.body);
    if (input.submitForReview && (!input.authenticityAccepted || !input.organiserTermsAccepted)) { res.status(400).json({ error: "Accept the event declarations before submission." }); return; }
    const account = res.locals.account as Account;
    const [existing] = await db.select().from(eventsTable).where(and(eq(eventsTable.id, eventId), eq(eventsTable.organiserId, account.id))).limit(1);
    if (!existing) { res.status(404).json({ error: "Event not found." }); return; }
    const nextStatus = input.submitForReview ? "pending" : existing.status === "published" ? "pending" : existing.status;
    await db.transaction(async (tx) => {
      await tx.update(eventsTable).set({ title: input.title, description: input.description, city: input.city, venue: input.venue, startsAt: input.startsAt, category: input.category, imageUrl: input.imageUrl, authenticityAccepted: input.authenticityAccepted, organiserTermsAccepted: input.organiserTermsAccepted, status: nextStatus, reviewNote: null }).where(eq(eventsTable.id, eventId));
      await tx.delete(ticketCategoriesTable).where(eq(ticketCategoriesTable.eventId, eventId));
      await tx.insert(ticketCategoriesTable).values(input.ticketCategories.map((category) => ({ eventId, name: category.name, description: category.description, price: category.price, quantity: category.quantityAvailable, salesStart: category.salesStart, salesEnd: category.salesEnd })));
    });
    res.json(await getEvent(eventId));
  } catch (error) { next(error); }
});

router.get("/admin/applications", requireRole("admin"), async (_req, res, next) => {
  try {
    const applications = await db.select({ application: organiserApplicationsTable, name: usersTable.name, email: usersTable.email }).from(organiserApplicationsTable).innerJoin(usersTable, eq(organiserApplicationsTable.userId, usersTable.id));
    res.json(applications.map((item) => ({ ...item.application, applicantName: item.name, accountEmail: item.email })));
  } catch (error) { next(error); }
});

router.patch("/admin/applications/:applicationId/decision", requireRole("admin"), async (req, res, next) => {
  try {
    const applicationId = z.coerce.number().int().positive().parse(req.params.applicationId);
    const body = z.object({ decision: z.enum(["approve", "reject", "request_information"]), reviewNote: z.string().max(2000) }).parse(req.body);
    const [application] = await db.select().from(organiserApplicationsTable).where(eq(organiserApplicationsTable.id, applicationId)).limit(1);
    if (!application) { res.status(404).json({ error: "Application not found." }); return; }
    const status = body.decision === "approve" ? "approved" : body.decision === "reject" ? "rejected" : "more_information_required";
    const account = res.locals.account as Account;
    await db.transaction(async (tx) => {
      await tx.update(organiserApplicationsTable).set({ status, reviewNote: body.reviewNote, paymentStatus: body.decision === "approve" ? "pending" : application.paymentStatus }).where(eq(organiserApplicationsTable.id, applicationId));
      await tx.update(usersTable).set({ role: body.decision === "approve" ? "organiser" : "customer" }).where(eq(usersTable.id, application.userId));
      await tx.insert(auditLogsTable).values({ actorId: account.id, action: body.decision, entityType: "organiser_application", entityId: String(applicationId), details: { reviewNote: body.reviewNote } });
    });
    const [applicant] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, application.userId)).limit(1);
    if (applicant) {
      const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:8000";
      const verificationUrl = `${webOrigin}/organiser/verification`;
      void deliverEmail({ to: applicant.email, subject: body.decision === "approve" ? "Your organiser application was approved" : body.decision === "reject" ? "Your organiser application was not approved" : "More information needed for your organiser application", html: applicationDecisionEmail({ name: applicant.name, organisationName: application.organisationName, decision: body.decision === "approve" ? "approved" : body.decision === "reject" ? "rejected" : "more_information_required", reviewNote: body.reviewNote, verificationUrl }), entityType: "organiser_application", entityId: String(applicationId) });
    }
    res.json({ ...application, status, reviewNote: body.reviewNote, paymentStatus: body.decision === "approve" ? "pending" : application.paymentStatus });
  } catch (error) { next(error); }
});

export default router;
