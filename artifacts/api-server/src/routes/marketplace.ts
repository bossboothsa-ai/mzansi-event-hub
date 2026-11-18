import { Router } from "express";
import { and, asc, eq, gte, ilike, lte, min, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, eventsTable, eventReportsTable, organiserApplicationsTable, ticketCategoriesTable, usersTable } from "@workspace/db";

const router = Router();
const publicStatuses = ["published"] as const;

async function publicEventRows(filters: { search?: string; city?: string; category?: string; from?: Date; to?: Date } = {}) {
  const clauses = [eq(eventsTable.status, publicStatuses[0])];
  if (filters.city) clauses.push(eq(eventsTable.city, filters.city));
  if (filters.category) clauses.push(eq(eventsTable.category, filters.category));
  if (filters.from) clauses.push(gte(eventsTable.startsAt, filters.from));
  if (filters.to) clauses.push(lte(eventsTable.startsAt, filters.to));
  if (filters.search) {
    const term = `%${filters.search}%`;
    clauses.push(or(ilike(eventsTable.title, term), ilike(eventsTable.city, term), ilike(eventsTable.venue, term), ilike(eventsTable.description, term))!);
  }
  return db.select({
    id: eventsTable.id,
    title: eventsTable.title,
    description: eventsTable.description,
    city: eventsTable.city,
    venue: eventsTable.venue,
    startsAt: eventsTable.startsAt,
    category: eventsTable.category,
    imageUrl: eventsTable.imageUrl,
    status: eventsTable.status,
    organiserName: sql<string>`coalesce(${organiserApplicationsTable.organisationName}, ${usersTable.name})`,
    minPrice: min(ticketCategoriesTable.price),
  }).from(eventsTable)
    .innerJoin(usersTable, eq(eventsTable.organiserId, usersTable.id))
    .leftJoin(organiserApplicationsTable, eq(organiserApplicationsTable.userId, usersTable.id))
    .leftJoin(ticketCategoriesTable, eq(ticketCategoriesTable.eventId, eventsTable.id))
    .where(and(...clauses))
    .groupBy(eventsTable.id, usersTable.name, organiserApplicationsTable.organisationName)
    .orderBy(asc(eventsTable.startsAt));
}

router.get("/marketplace/summary", async (_req, res, next) => {
  try {
    const events = await publicEventRows();
    res.json({
      events: events.slice(0, 6).map((event) => ({ ...event, currency: "ZAR" })),
      cities: [...new Set(events.map((event) => event.city))],
      categories: [...new Set(events.map((event) => event.category))],
    });
  } catch (error) { next(error); }
});

router.get("/events", async (req, res, next) => {
  try {
    const query = z.object({ search: z.string().optional(), city: z.string().optional(), category: z.string().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).parse(req.query);
    const events = await publicEventRows(query);
    res.json(events.map((event) => ({ ...event, currency: "ZAR" })));
  } catch (error) { next(error); }
});

router.get("/events/:eventId", async (req, res, next) => {
  try {
    const eventId = z.coerce.number().int().positive().parse(req.params.eventId);
    const [event] = await publicEventRows().then((rows) => rows.filter((row) => row.id === eventId));
    if (!event) { res.status(404).json({ error: "Event not found." }); return; }
    const categories = await db.select().from(ticketCategoriesTable).where(eq(ticketCategoriesTable.eventId, eventId)).orderBy(asc(ticketCategoriesTable.price));
    res.json({ ...event, currency: "ZAR", organiserVerified: true, ticketCategories: categories.map((category) => ({ id: category.id, name: category.name, description: category.description, price: category.price, quantityAvailable: category.quantity, salesStart: category.salesStart, salesEnd: category.salesEnd })) });
  } catch (error) { next(error); }
});

router.post("/marketplace/reports", async (req, res, next) => {
  try {
    const body = z.object({ eventId: z.number().int().positive(), reason: z.enum(["misleading", "suspicious-payment", "unsafe", "duplicate", "other"]), details: z.string().min(10).max(2000), contactEmail: z.string().email() }).parse(req.body);
    // Verify the event exists first so an unknown id is a client error, not a FK 500.
    const [event] = await db.select({ id: eventsTable.id }).from(eventsTable).where(eq(eventsTable.id, body.eventId)).limit(1);
    if (!event) { res.status(404).json({ error: "That event could not be found." }); return; }
    const [report] = await db.insert(eventReportsTable).values(body).returning({ id: eventReportsTable.id, status: eventReportsTable.status });
    res.status(201).json(report);
  } catch (error) { next(error); }
});

export default router;
