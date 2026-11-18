import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { asc, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, auditLogsTable, emailOutboxTable, eventCommunicationsTable, eventsTable, eventReportsTable, organiserApplicationsTable, onboardingFeeSettingsTable, ordersTable, usersTable, verificationDocumentsTable } from "@workspace/db";
import { requireRole, type Account } from "../lib/auth";
import { serializeEvent } from "../lib/events";
import { deliverEmail } from "../lib/email";
import { eventDecisionEmail, onboardingPaymentConfirmedEmail } from "../lib/email-templates";

const router = Router();
// Scope the guard to admin paths only. A bare router.use() would run for every
// request that falls through to this router (e.g. /api/tickets) and 403 it.
router.use("/admin", requireRole("admin"));

router.get("/admin/documents/:documentId", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.documentId);
    const [document] = await db.select().from(verificationDocumentsTable).where(eq(verificationDocumentsTable.id, id)).limit(1);
    if (!document) { res.status(404).json({ error: "Document not found." }); return; }
    const root = path.resolve(process.env.PRIVATE_DOCUMENTS_DIR ?? path.join(process.cwd(), "private-documents"));
    const file = await readFile(path.join(root, document.storageKey));
    res.type(document.mimeType).attachment(document.fileName).send(file);
  } catch (error) { next(error); }
});

router.get("/admin/events", async (_req, res, next) => {
  try {
    const rows = await db.select({ id: eventsTable.id, status: eventsTable.status }).from(eventsTable).orderBy(asc(eventsTable.createdAt));
    res.json(await Promise.all(rows.map((row) => serializeEvent(row.id))));
  } catch (error) { next(error); }
});

router.patch("/admin/events/:eventId/decision", async (req, res, next) => {
  try {
    const eventId = z.coerce.number().int().positive().parse(req.params.eventId);
    const input = z.object({ decision: z.enum(["approve", "publish", "reject", "request_information", "suspend", "restore"]), reviewNote: z.string().max(2000) }).parse(req.body);
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!event) { res.status(404).json({ error: "Event not found." }); return; }
    if (input.decision === "publish" && event.status !== "approved") { res.status(409).json({ error: "Approve the event before publishing it." }); return; }
    if (input.decision === "restore" && event.status !== "suspended") { res.status(409).json({ error: "Only suspended events can be restored." }); return; }
    const status = input.decision === "approve" ? "approved" : input.decision === "publish" ? "published" : input.decision === "reject" ? "rejected" : input.decision === "request_information" ? "more_information_required" : input.decision === "suspend" ? "suspended" : event.statusBeforeSuspension ?? "approved";
    const account = res.locals.account as Account;
    await db.transaction(async (tx) => {
      await tx.update(eventsTable).set({ status, reviewNote: input.reviewNote || null, statusBeforeSuspension: input.decision === "suspend" ? event.status : input.decision === "restore" ? null : event.statusBeforeSuspension }).where(eq(eventsTable.id, eventId));
      await tx.insert(auditLogsTable).values({ actorId: account.id, action: input.decision, entityType: "event", entityId: String(eventId), details: { reviewNote: input.reviewNote } });
    });
    if (["approve", "publish", "reject", "request_information"].includes(input.decision)) {
      const [organiser] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, event.organiserId)).limit(1);
      if (organiser) {
        const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:8000";
        const dashboardUrl = `${webOrigin}/organiser/events/${eventId}`;
        const decision = input.decision === "request_information" ? "more_information_required" : input.decision as "approved" | "rejected" | "published";
        void deliverEmail({ to: organiser.email, subject: eventDecisionEmail({ organiserName: organiser.name, eventTitle: event.title, decision, reviewNote: input.reviewNote, dashboardUrl }).match(/<title>(.*?)<\/title>/)?.[1] ?? `Update on ${event.title}`, html: eventDecisionEmail({ organiserName: organiser.name, eventTitle: event.title, decision, reviewNote: input.reviewNote, dashboardUrl }), entityType: "event", entityId: String(eventId) });
      }
    }
    res.json(await serializeEvent(eventId));
  } catch (error) { next(error); }
});

router.get("/admin/dashboard", async (_req, res, next) => {
  try {
    const allEvents = await db.select({ status: eventsTable.status }).from(eventsTable);
    const [pendingApps] = await db.select({ count: count() }).from(organiserApplicationsTable).where(eq(organiserApplicationsTable.status, "pending"));
    const [organisers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "organiser"));
    const [sales] = await db.select({ ticketsSold: sql<number>`coalesce(sum(${ordersTable.quantity}), 0)`, grossRevenue: sql<number>`coalesce(sum(${ordersTable.amount}), 0)` }).from(ordersTable).where(eq(ordersTable.status, "paid"));
    res.json({ events: allEvents.length, pendingEventApplications: allEvents.filter((event) => event.status === "pending").length, pendingOrganiserApplications: pendingApps?.count ?? 0, verifiedOrganisers: organisers?.count ?? 0, ticketsSold: Number(sales?.ticketsSold ?? 0), grossRevenue: Number(sales?.grossRevenue ?? 0) });
  } catch (error) { next(error); }
});

router.get("/admin/reports", async (_req, res, next) => {
  try {
    const reports = await db.select({ report: eventReportsTable, eventTitle: eventsTable.title }).from(eventReportsTable).innerJoin(eventsTable, eq(eventReportsTable.eventId, eventsTable.id)).orderBy(asc(eventReportsTable.createdAt));
    res.json(reports.map((item) => ({ ...item.report, eventTitle: item.eventTitle })));
  } catch (error) { next(error); }
});

router.patch("/admin/reports/:reportId/decision", async (req, res, next) => {
  try {
    const reportId = z.coerce.number().int().positive().parse(req.params.reportId);
    const body = z.object({ decision: z.enum(["investigate", "resolve", "dismiss"]), reviewNote: z.string().min(2).max(2000) }).parse(req.body);
    const [report] = await db.select().from(eventReportsTable).where(eq(eventReportsTable.id, reportId)).limit(1);
    if (!report) { res.status(404).json({ error: "Report not found." }); return; }
    const account = res.locals.account as Account;
    const status = body.decision === "investigate" ? "investigating" : body.decision === "resolve" ? "resolved" : "dismissed";
    await db.transaction(async (tx) => {
      await tx.update(eventReportsTable).set({ status, reviewNote: body.reviewNote }).where(eq(eventReportsTable.id, reportId));
      await tx.insert(auditLogsTable).values({ actorId: account.id, action: body.decision, entityType: "event_report", entityId: String(reportId), details: { reviewNote: body.reviewNote } });
    });
    res.json({ ...report, status, reviewNote: body.reviewNote });
  } catch (error) { next(error); }
});

router.get("/admin/onboarding-fee", async (_req, res, next) => {
  try {
    const [fee] = await db.select().from(onboardingFeeSettingsTable).where(eq(onboardingFeeSettingsTable.key, "organiser_onboarding_fee")).limit(1);
    res.json({ amount: fee?.amount ?? 0, currency: "ZAR", cadence: "once_off" });
  } catch (error) { next(error); }
});

router.patch("/admin/onboarding-fee", async (req, res, next) => {
  try {
    const body = z.object({ amount: z.number().min(0).max(100000), reason: z.string().max(500).optional() }).parse(req.body);
    const account = res.locals.account as Account;
    await db.insert(onboardingFeeSettingsTable).values({ key: "organiser_onboarding_fee", amount: body.amount }).onConflictDoUpdate({ target: onboardingFeeSettingsTable.key, set: { amount: body.amount } });
    await db.insert(auditLogsTable).values({ actorId: account.id, action: "update_onboarding_fee", entityType: "platform_setting", entityId: "organiser_onboarding_fee", details: { amount: body.amount, reason: body.reason ?? "Administrative update" } });
    res.json({ amount: body.amount, currency: "ZAR", cadence: "once_off" });
  } catch (error) { next(error); }
});

router.get("/admin/onboarding-payments", async (_req, res, next) => {
  try {
    const rows = await db.select({ organiserId: usersTable.id, name: usersTable.name, organisationName: organiserApplicationsTable.organisationName, status: organiserApplicationsTable.status, paymentStatus: organiserApplicationsTable.paymentStatus, contactEmail: organiserApplicationsTable.contactEmail }).from(organiserApplicationsTable).innerJoin(usersTable, eq(usersTable.id, organiserApplicationsTable.userId));
    res.json(rows);
  } catch (error) { next(error); }
});

router.patch("/admin/onboarding-payments/:organiserId", async (req, res, next) => {
  try {
    const organiserId = z.string().uuid().parse(req.params.organiserId);
    const body = z.object({ status: z.enum(["pending", "paid", "waived"]), reconciliationReference: z.string().min(3).max(160), note: z.string().max(1000).optional() }).parse(req.body);
    const [application] = await db.select().from(organiserApplicationsTable).where(eq(organiserApplicationsTable.userId, organiserId)).limit(1);
    if (!application) { res.status(404).json({ error: "Organiser application not found." }); return; }
    if (body.status === "paid" && !body.reconciliationReference.trim()) { res.status(400).json({ error: "A reconciled payment reference is required." }); return; }
    const account = res.locals.account as Account;
    await db.transaction(async (tx) => {
      await tx.update(organiserApplicationsTable).set({ paymentStatus: body.status }).where(eq(organiserApplicationsTable.userId, organiserId));
      await tx.insert(auditLogsTable).values({ actorId: account.id, action: "update_onboarding_payment", entityType: "organiser", entityId: organiserId, details: { status: body.status, reconciliationReference: body.reconciliationReference, note: body.note ?? "" } });
    });
    if (body.status === "paid" || body.status === "waived") {
      const [organiser] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, organiserId)).limit(1);
      if (organiser) {
        const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:8000";
        void deliverEmail({ to: organiser.email, subject: "Your onboarding payment is confirmed", html: onboardingPaymentConfirmedEmail({ name: organiser.name, organisationName: application.organisationName, amount: body.status === "waived" ? "Waived by platform" : body.reconciliationReference, dashboardUrl: `${webOrigin}/organiser/create` }), entityType: "organiser", entityId: organiserId });
      }
    }
    res.json({ organiserId, status: body.status, reconciliationReference: body.reconciliationReference });
  } catch (error) { next(error); }
});

router.get("/admin/audit-logs", async (_req, res, next) => {
  try {
    const entries = await db.select({ id: auditLogsTable.id, actorId: auditLogsTable.actorId, actorName: usersTable.name, action: auditLogsTable.action, entityType: auditLogsTable.entityType, entityId: auditLogsTable.entityId, details: auditLogsTable.details, createdAt: auditLogsTable.createdAt }).from(auditLogsTable).innerJoin(usersTable, eq(auditLogsTable.actorId, usersTable.id)).orderBy(asc(auditLogsTable.createdAt)).limit(250);
    res.json(entries);
  } catch (error) { next(error); }
});

router.get("/admin/users", async (_req, res, next) => {
  try {
    const rows = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, role: usersTable.role, marketingConsent: usersTable.marketingConsent, createdAt: usersTable.createdAt, organisationName: organiserApplicationsTable.organisationName, organiserStatus: organiserApplicationsTable.status, onboardingPaymentStatus: organiserApplicationsTable.paymentStatus }).from(usersTable).leftJoin(organiserApplicationsTable, eq(organiserApplicationsTable.userId, usersTable.id)).orderBy(asc(usersTable.createdAt));
    res.json(rows);
  } catch (error) { next(error); }
});

router.get("/admin/communications", async (_req, res, next) => {
  try {
    const rows = await db.select({ id: eventCommunicationsTable.id, eventId: eventCommunicationsTable.eventId, eventTitle: eventsTable.title, senderId: eventCommunicationsTable.senderId, senderName: usersTable.name, category: eventCommunicationsTable.category, audience: eventCommunicationsTable.audience, subject: eventCommunicationsTable.subject, content: eventCommunicationsTable.content, recipients: eventCommunicationsTable.recipients, recipientCount: eventCommunicationsTable.recipientCount, transactional: eventCommunicationsTable.transactional, status: eventCommunicationsTable.status, createdAt: eventCommunicationsTable.createdAt }).from(eventCommunicationsTable).innerJoin(eventsTable, eq(eventCommunicationsTable.eventId, eventsTable.id)).innerJoin(usersTable, eq(eventCommunicationsTable.senderId, usersTable.id)).orderBy(sql`${eventCommunicationsTable.createdAt} desc`).limit(500);
    res.json(rows);
  } catch (error) { next(error); }
});

router.get("/admin/emails", async (_req, res, next) => {
  try {
    const rows = await db.select({ id: emailOutboxTable.id, recipient: emailOutboxTable.recipient, subject: emailOutboxTable.subject, status: emailOutboxTable.status, provider: emailOutboxTable.provider, providerMessageId: emailOutboxTable.providerMessageId, error: emailOutboxTable.error, entityType: emailOutboxTable.entityType, entityId: emailOutboxTable.entityId, createdAt: emailOutboxTable.createdAt, sentAt: emailOutboxTable.sentAt }).from(emailOutboxTable).orderBy(sql`${emailOutboxTable.createdAt} desc`).limit(200);
    res.json(rows);
  } catch (error) { next(error); }
});

router.get("/admin/emails/:emailId", async (req, res, next) => {
  try {
    const emailId = z.coerce.number().int().positive().parse(req.params.emailId);
    const [email] = await db.select().from(emailOutboxTable).where(eq(emailOutboxTable.id, emailId)).limit(1);
    if (!email) { res.status(404).json({ error: "Email not found." }); return; }
    res.json(email);
  } catch (error) { next(error); }
});

export default router;
