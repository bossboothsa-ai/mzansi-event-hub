import { db, emailOutboxTable } from "@workspace/db";
import { logger } from "./logger";

export class EmailConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = "EmailConfigurationError"; }
}

export async function sendEmail(input: { to: string; subject: string; html: string; idempotencyKey?: string; entityType?: string; entityId?: string }): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new EmailConfigurationError("Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM on the API server.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !result.id) throw new Error(result.message ?? `Email provider returned HTTP ${response.status}.`);
  return { id: result.id };
}

export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export async function deliverEmail(input: { to: string; subject: string; html: string; idempotencyKey?: string; entityType?: string; entityId?: string }): Promise<{ status: string; id?: string; error?: string }> {
  try {
    const sent = await sendEmail(input);
    await db.insert(emailOutboxTable).values({ recipient: input.to, subject: input.subject, html: input.html, status: "sent", provider: "resend", providerMessageId: sent.id, entityType: input.entityType ?? null, entityId: input.entityId ?? null, sentAt: new Date() });
    return { status: "sent", id: sent.id };
  } catch (error) {
    const status = error instanceof EmailConfigurationError ? "provider_not_configured" : "failed";
    const message = error instanceof Error ? error.message : "Email delivery failed.";
    try {
      await db.insert(emailOutboxTable).values({ recipient: input.to, subject: input.subject, html: input.html, status, provider: "resend", error: message, entityType: input.entityType ?? null, entityId: input.entityId ?? null });
    } catch (dbError) {
      logger.error({ err: dbError }, "Failed to record email in outbox");
    }
    return { status, error: message };
  }
}