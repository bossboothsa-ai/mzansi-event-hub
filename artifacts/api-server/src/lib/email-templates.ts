import { escapeHtml } from "./email";

const BRAND = {
  name: "Out There ZA",
  tagline: "Good things happen live.",
  accent: "#7c63e8",
  accentHover: "#6a52d6",
  ink: "#0a1120",
  inkLight: "#4a5568",
  paper: "#f7f8fb",
  white: "#ffffff",
  border: "#e2e8f0",
  success: "#38a169",
  warning: "#dd6b20",
  danger: "#e53e3e",
};

function shell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en-ZA">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:${BRAND.white};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:${BRAND.ink};padding:20px 28px;">
          <span style="font-size:18px;font-weight:700;color:${BRAND.white};letter-spacing:-0.5px;">out<span style="color:${BRAND.accent};">there</span> <span style="font-size:11px;background:${BRAND.accent};color:${BRAND.white};padding:2px 6px;border-radius:4px;margin-left:4px;">ZA</span></span>
        </td></tr>
        <tr><td style="padding:32px 28px;">
          ${content}
        </td></tr>
        <tr><td style="background:${BRAND.paper};border-top:1px solid ${BRAND.border};padding:20px 28px;text-align:center;">
          <p style="margin:0;font-size:12px;color:${BRAND.inkLight};">${BRAND.name} &middot; ${BRAND.tagline}</p>
          <p style="margin:8px 0 0;font-size:11px;color:${BRAND.inkLight};opacity:0.7;">You are receiving this because you have an account or event with ${BRAND.name}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function heading(text: string, accent = false): string {
  return `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;line-height:1.2;color:${accent ? BRAND.accent : BRAND.ink};">${escapeHtml(text)}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BRAND.inkLight};">${escapeHtml(text)}</p>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="background:${BRAND.accent};border-radius:8px;">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:${BRAND.white};text-decoration:none;border-radius:8px;">${escapeHtml(label)} &rarr;</a>
  </td></tr></table>`;
}

function infoBox(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:${BRAND.paper};border:1px solid ${BRAND.border};border-radius:8px;">
    <tr><td style="padding:14px 18px;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.inkLight};">${escapeHtml(label)}</p>
      <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:${BRAND.ink};">${escapeHtml(value)}</p>
    </td></tr>
  </table>`;
}

function badge(text: string, tone: "success" | "warning" | "danger" | "neutral" = "neutral"): string {
  const colors = { success: BRAND.success, warning: BRAND.warning, danger: BRAND.danger, neutral: BRAND.accent };
  const bg = { success: "#f0fff4", warning: "#fffaf0", danger: "#fff5f5", neutral: "#f5f3ff" };
  return `<span style="display:inline-block;padding:4px 12px;background:${bg[tone]};color:${colors[tone]};font-size:12px;font-weight:600;border-radius:12px;">${escapeHtml(text)}</span>`;
}

export function ticketDeliveryEmail(input: { customerName: string; eventTitle: string; categoryName: string; startsAt: string; venue: string; city: string; reference: string; manageUrl: string }): string {
  return shell(`
    ${heading(`Your ticket for ${input.eventTitle}`)}
    ${paragraph(`Hi ${input.customerName.split(" ")[0]}, you're going to ${input.eventTitle}! Your payment is confirmed and your ticket is ready.`)}
    ${infoBox("Event", input.eventTitle)}
    ${infoBox("Ticket type", input.categoryName)}
    ${infoBox("When", input.startsAt)}
    ${infoBox("Where", `${input.venue}, ${input.city}`)}
    ${infoBox("Your reference", input.reference)}
    ${button(input.manageUrl, "View my tickets")}
    ${paragraph("Open your account to display the scannable QR code at the door. You can also re-send this ticket from your account at any time.")}
    <p style="margin:0;font-size:12px;color:${BRAND.inkLight};">Keep this reference handy &mdash; it matches your ticket.</p>
  `);
}

export function welcomeEmail(input: { name: string; signInUrl: string }): string {
  return shell(`
    ${heading(`Welcome to ${BRAND.name}, ${input.name.split(" ")[0]}.`)}
    ${paragraph("You're in. Good nights, long lunches, big ideas and the little moments you'll talk about later &mdash; they're all out there.")}
    ${paragraph("Your account lets you book tickets, keep them in one place, and check in quickly at the door. When you're ready to host, you can also apply to become an organiser and list your own events.")}
    ${button(input.signInUrl, "Explore the marketplace")}
    <p style="margin:0;font-size:12px;color:${BRAND.inkLight};">Need a hand? Reply to this email and our team will help.</p>
  `);
}

export function applicationDecisionEmail(input: { name: string; organisationName: string; decision: "approved" | "rejected" | "more_information_required"; reviewNote: string; verificationUrl: string }): string {
  const config = {
    approved: { subject: `Your organiser application was approved`, heading: `You're approved, ${input.name.split(" ")[0]}.`, body: `Your application to organise events as <strong>${escapeHtml(input.organisationName)}</strong> has been approved. You can now complete the onboarding payment to unlock publishing.`, tone: "success" as const, badge: "Approved" },
    rejected: { subject: `Your organiser application was not approved`, heading: `An update on your application`, body: `Your application to organise events as <strong>${escapeHtml(input.organisationName)}</strong> was not approved. Read the note below to understand the decision and what to do next.`, tone: "danger" as const, badge: "Not approved" },
    more_information_required: { subject: `More information needed for your organiser application`, heading: `We need a little more, ${input.name.split(" ")[0]}.`, body: `The review team needs additional details before your application as <strong>${escapeHtml(input.organisationName)}</strong> can be approved. Please update your application.`, tone: "warning" as const, badge: "More info needed" },
  }[input.decision];
  return shell(`
    ${badge(config.badge, config.tone)}
    <div style="height:16px;"></div>
    ${heading(config.heading)}
    ${paragraph(config.body)}
    ${input.reviewNote ? infoBox("Note from the review team", input.reviewNote) : ""}
    ${button(input.verificationUrl, "View application status")}
    <p style="margin:0;font-size:12px;color:${BRAND.inkLight};">Questions about this decision? Open your application and message the review team.</p>
  `);
}

export function eventDecisionEmail(input: { organiserName: string; eventTitle: string; decision: "approved" | "rejected" | "published" | "more_information_required"; reviewNote: string; dashboardUrl: string }): string {
  const config = {
    approved: { subject: `Your event "${input.eventTitle}" was approved`, heading: `Your event is approved.`, body: `Your event <strong>${escapeHtml(input.eventTitle)}</strong> has been approved and is ready to be published. Once published, it will appear on the marketplace.`, tone: "success" as const, badge: "Approved" },
    published: { subject: `Your event "${input.eventTitle}" is now live`, heading: `You're live, ${input.organiserName.split(" ")[0]}.`, body: `Your event <strong>${escapeHtml(input.eventTitle)}</strong> is now published and visible on the Out There ZA marketplace. Customers can start booking tickets.`, tone: "success" as const, badge: "Published" },
    rejected: { subject: `Your event "${input.eventTitle}" was not approved`, heading: `An update on your event`, body: `Your event <strong>${escapeHtml(input.eventTitle)}</strong> was not approved. Read the note below to understand the decision.`, tone: "danger" as const, badge: "Not approved" },
    more_information_required: { subject: `More information needed for "${input.eventTitle}"`, heading: `We need more detail on your event.`, body: `The review team needs additional information before <strong>${escapeHtml(input.eventTitle)}</strong> can be approved. Please update the event and resubmit.`, tone: "warning" as const, badge: "More info needed" },
  }[input.decision];
  return shell(`
    ${badge(config.badge, config.tone)}
    <div style="height:16px;"></div>
    ${heading(config.heading)}
    ${paragraph(config.body)}
    ${input.reviewNote ? infoBox("Note from the review team", input.reviewNote) : ""}
    ${button(input.dashboardUrl, "View event dashboard")}
  `);
}

export function passwordResetEmail(input: { name: string; resetUrl: string }): string {
  return shell(`
    ${heading(`Password reset request`)}
    ${paragraph(`Hi ${input.name.split(" ")[0]}, we received a request to reset the password for your Out There ZA account. Click the button below to choose a new password. This link expires in 1 hour.`)}
    ${button(input.resetUrl, "Reset my password")}
    ${paragraph("If you didn't request this, you can safely ignore this email &mdash; your password will not change.")}
    <p style="margin:0;font-size:12px;color:${BRAND.inkLight};">For your security, this link can only be used once.</p>
  `);
}

export function onboardingPaymentConfirmedEmail(input: { name: string; organisationName: string; amount: string; dashboardUrl: string }): string {
  return shell(`
    ${badge("Payment confirmed", "success")}
    <div style="height:16px;"></div>
    ${heading(`You're all set, ${input.name.split(" ")[0]}.`)}
    ${paragraph(`Your onboarding payment for <strong>${escapeHtml(input.organisationName)}</strong> has been confirmed by the platform. Your organiser account now has full publishing access &mdash; you can create and submit events for review.`)}
    ${infoBox("Amount", input.amount)}
    ${button(input.dashboardUrl, "Create your first event")}
  `);
}