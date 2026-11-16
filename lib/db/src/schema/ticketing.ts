import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("ticketing_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organiserApplicationsTable = pgTable(
  "organiser_applications",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    accountType: text("account_type").notNull(),
    legalName: text("legal_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    phone: text("phone").notNull(),
    organisationName: text("organisation_name").notNull(),
    registrationNumber: text("registration_number"),
    identityDocumentPath: text("identity_document_path"),
    businessDocumentPath: text("business_document_path"),
    authenticityAccepted: boolean("authenticity_accepted").notNull().default(false),
    agreementAccepted: boolean("agreement_accepted").notNull().default(false),
    status: text("status").notNull().default("pending"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organiser_applications_user_unique").on(table.userId),
    index("organiser_applications_status_idx").on(table.status),
  ],
);

export const eventsTable = pgTable(
  "ticketing_events",
  {
    id: serial("id").primaryKey(),
    organiserId: text("organiser_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    city: text("city").notNull(),
    venue: text("venue").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    category: text("category").notNull(),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("draft"),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("ticketing_events_status_date_idx").on(table.status, table.startsAt),
    index("ticketing_events_organiser_idx").on(table.organiserId),
  ],
);

export const ticketCategoriesTable = pgTable(
  "ticket_categories",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    price: numeric("price", { precision: 12, scale: 2, mode: "number" }).notNull(),
    quantity: integer("quantity").notNull(),
    salesStart: timestamp("sales_start", { withTimezone: true }),
    salesEnd: timestamp("sales_end", { withTimezone: true }),
  },
  (table) => [index("ticket_categories_event_idx").on(table.eventId)],
);

export const organiserPaymentSettingsTable = pgTable("organiser_payment_settings", {
  organiserId: text("organiser_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  sandboxMerchantId: text("sandbox_merchant_id").notNull(),
  encryptedMerchantKey: text("encrypted_merchant_key").notNull(),
  encryptedPassphrase: text("encrypted_passphrase").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ordersTable = pgTable(
  "ticketing_orders",
  {
    id: serial("id").primaryKey(),
    checkoutReference: text("checkout_reference").notNull(),
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "restrict" }),
    ticketCategoryId: integer("ticket_category_id").notNull().references(() => ticketCategoriesTable.id, { onDelete: "restrict" }),
    organiserId: text("organiser_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
    customerId: text("customer_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ticketing_orders_reference_unique").on(table.checkoutReference),
    index("ticketing_orders_customer_idx").on(table.customerId),
    index("ticketing_orders_event_idx").on(table.eventId),
  ],
);

export const paymentsTable = pgTable(
  "ticketing_payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "restrict" }),
    provider: text("provider").notNull().default("payfast_sandbox"),
    providerPaymentId: text("provider_payment_id"),
    status: text("status").notNull().default("pending"),
    amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
    notification: jsonb("notification").$type<Record<string, string> | null>(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ticketing_payments_order_unique").on(table.orderId),
    uniqueIndex("ticketing_payments_provider_id_unique")
      .on(table.providerPaymentId)
      .where(sql`${table.providerPaymentId} IS NOT NULL`),
  ],
);

export const ticketsTable = pgTable(
  "issued_tickets",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "restrict" }),
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "restrict" }),
    ticketCategoryId: integer("ticket_category_id").notNull().references(() => ticketCategoriesTable.id, { onDelete: "restrict" }),
    customerId: text("customer_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
    qrToken: text("qr_token").notNull(),
    status: text("status").notNull().default("valid"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("issued_tickets_qr_token_unique").on(table.qrToken),
    index("issued_tickets_event_idx").on(table.eventId),
    index("issued_tickets_customer_idx").on(table.customerId),
  ],
);

export const eventStaffTable = pgTable(
  "ticketing_event_staff",
  {
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    assignedBy: text("assigned_by").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.userId] })],
);

export const checkInsTable = pgTable(
  "ticketing_check_ins",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id").notNull().references(() => ticketsTable.id, { onDelete: "restrict" }),
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "restrict" }),
    scannedBy: text("scanned_by").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("ticketing_check_ins_ticket_unique").on(table.ticketId)],
);

export const eventReportsTable = pgTable(
  "event_reports",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    details: text("details").notNull(),
    contactEmail: text("contact_email").notNull(),
    status: text("status").notNull().default("open"),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("event_reports_status_idx").on(table.status)],
);

export const verificationDocumentsTable = pgTable(
  "verification_documents",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verification_documents_owner_idx").on(table.ownerId)],
);

export const onboardingFeeSettingsTable = pgTable("ticketing_platform_settings", {
  key: text("key").primaryKey(),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
});

export const auditLogsTable = pgTable(
  "ticketing_audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: text("actor_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    details: jsonb("details").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ticketing_audit_logs_created_idx").on(table.createdAt)],
);
