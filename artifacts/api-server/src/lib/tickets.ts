import { db, ticketDeliveriesTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { deliverEmail } from "./email";
import { ticketDeliveryEmail } from "./email-templates";
import { eventsTable, ordersTable, ticketCategoriesTable, ticketsTable, usersTable } from "@workspace/db";

async function ticketRecord(ticketId: number) {
  const [row] = await db.select({ ticket: ticketsTable, event: eventsTable, category: ticketCategoriesTable, order: ordersTable, customer: usersTable }).from(ticketsTable)
    .innerJoin(eventsTable, eq(ticketsTable.eventId, eventsTable.id))
    .innerJoin(ticketCategoriesTable, eq(ticketsTable.ticketCategoryId, ticketCategoriesTable.id))
    .innerJoin(ordersTable, eq(ticketsTable.orderId, ordersTable.id))
    .innerJoin(usersTable, eq(ticketsTable.customerId, usersTable.id))
    .where(eq(ticketsTable.id, ticketId)).limit(1);
  return row;
}

export async function deliverTicket(ticketId: number, actorId?: string): Promise<{ status: string; recipient?: string; error?: string; createdAt?: Date }> {
  const row = await ticketRecord(ticketId);
  if (!row) throw new Error("Ticket not found.");
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:8000";
  const manageUrl = `${webOrigin}/account/tickets`;
  const result = await deliverEmail({
    to: row.customer.email,
    subject: `Your ticket: ${row.event.title}`,
    idempotencyKey: `ticket-delivery-${ticketId}-${Date.now()}`,
    html: ticketDeliveryEmail({
      customerName: row.customer.name,
      eventTitle: row.event.title,
      categoryName: row.category.name,
      startsAt: new Date(row.event.startsAt).toLocaleString("en-ZA"),
      venue: row.event.venue,
      city: row.event.city,
      reference: row.ticket.qrToken,
      manageUrl,
    }),
    entityType: "ticket",
    entityId: String(ticketId),
  });
  const [delivery] = await db.insert(ticketDeliveriesTable).values({
    ticketId,
    recipient: row.customer.email,
    provider: "resend",
    providerMessageId: result.id ?? null,
    status: result.status,
    error: result.error ?? null,
  }).returning();
  if (actorId) {
    await db.insert(auditLogsTable).values({ actorId, action: "resend_ticket", entityType: "ticket", entityId: String(ticketId), details: { deliveryId: delivery.id, recipient: row.customer.email } });
  }
  return { status: delivery.status, recipient: delivery.recipient, error: delivery.error ?? undefined, createdAt: delivery.createdAt };
}