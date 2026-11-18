import { and, asc, eq, sql } from "drizzle-orm";
import { db, eventsTable, organiserApplicationsTable, ordersTable, ticketCategoriesTable, usersTable } from "@workspace/db";

export async function serializeEvent(eventId: number) {
  const [row] = await db.select({ event: eventsTable, organiserName: usersTable.name, organisationName: organiserApplicationsTable.organisationName, organiserStatus: organiserApplicationsTable.status })
    .from(eventsTable).innerJoin(usersTable, eq(eventsTable.organiserId, usersTable.id))
    .leftJoin(organiserApplicationsTable, eq(organiserApplicationsTable.userId, usersTable.id))
    .where(eq(eventsTable.id, eventId)).limit(1);
  if (!row) return null;
  const categories = await db.select().from(ticketCategoriesTable).where(eq(ticketCategoriesTable.eventId, eventId)).orderBy(asc(ticketCategoriesTable.price));
  const [sales] = await db.select({ ticketsSold: sql<number>`coalesce(sum(${ordersTable.quantity}), 0)`, grossRevenue: sql<number>`coalesce(sum(${ordersTable.amount}), 0)` }).from(ordersTable).where(and(eq(ordersTable.eventId, eventId), eq(ordersTable.status, "paid")));
  return {
    ...row.event,
    organiserName: row.organisationName ?? row.organiserName,
    organiserVerified: row.organiserStatus === "approved",
    currency: "ZAR" as const,
    minPrice: categories.length ? Math.min(...categories.map((item) => item.price)) : 0,
    capacity: categories.reduce((sum, item) => sum + item.quantity, 0),
    ticketsSold: Number(sales?.ticketsSold ?? 0),
    grossRevenue: Number(sales?.grossRevenue ?? 0),
    ticketCategories: categories.map((item) => ({ id: item.id, name: item.name, description: item.description, price: item.price, quantityAvailable: item.quantity, salesStart: item.salesStart, salesEnd: item.salesEnd })),
  };
}
