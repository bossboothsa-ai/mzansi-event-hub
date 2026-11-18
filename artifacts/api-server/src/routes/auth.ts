import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, organiserApplicationsTable, passwordResetsTable, sessionsTable, usersTable } from "@workspace/db";
import { clearSession, createSession, hashPassword, hashToken, requireUser, setSessionCookie, verifyPassword } from "../lib/auth";
import { deliverEmail } from "../lib/email";
import { passwordResetEmail, welcomeEmail } from "../lib/email-templates";

const router = Router();
const credentials = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

const attempts = new Map<string, { count: number; resetsAt: number }>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetsAt <= now) {
    attempts.set(key, { count: 1, resetsAt: now + 15 * 60 * 1000 });
    return false;
  }
  current.count += 1;
  return current.count > 10;
}

router.post("/auth/register", async (req, res, next) => {
  try {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success || !parsed.data.name) {
      res.status(400).json({ error: "Enter your name, a valid email, and a password of at least 8 characters." });
      return;
    }
    const email = parsed.data.email.toLowerCase();
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    const id = randomUUID();
    const [user] = await db.insert(usersTable).values({ id, email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password), role: "customer" }).returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role });
    const token = await createSession(id);
    setSessionCookie(res, token);
    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:8000";
    void deliverEmail({ to: user.email, subject: `Welcome to Out There ZA, ${user.name.split(" ")[0]}`, html: welcomeEmail({ name: user.name, signInUrl: `${webOrigin}/sign-in` }), entityType: "user", entityId: user.id });
    res.status(201).json({ ...user, organiserStatus: "not_started", organisationName: null });
  } catch (error) { next(error); }
});

router.post("/auth/bootstrap-admin", async (req, res, next) => {
  try {
    if (rateLimited(`admin:${req.ip ?? "unknown"}`)) { res.status(429).json({ error: "Too many attempts." }); return; }
    const setupSecret = process.env.ADMIN_BOOTSTRAP_TOKEN;
    const input = z.object({ token: z.string().min(32), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), password: z.string().min(12).max(128) }).safeParse(req.body);
    if (!setupSecret || !input.success) { res.status(404).json({ error: "Admin bootstrap is not available." }); return; }
    const expected = Buffer.from(setupSecret);
    const provided = Buffer.from(input.data.token);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) { res.status(404).json({ error: "Admin bootstrap is not available." }); return; }
    const [admin] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin")).limit(1);
    if (admin) { res.status(410).json({ error: "An administrator account has already been created." }); return; }
    const id = randomUUID();
    const [user] = await db.insert(usersTable).values({ id, name: input.data.name, email: input.data.email.toLowerCase(), passwordHash: await hashPassword(input.data.password), role: "admin" }).returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role });
    const token = await createSession(id);
    setSessionCookie(res, token);
    res.status(201).json(user);
  } catch (error) { next(error); }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const key = req.ip ?? "unknown";
    if (rateLimited(key)) {
      res.status(429).json({ error: "Too many sign-in attempts. Try again in 15 minutes." });
      return;
    }
    const parsed = credentials.pick({ email: true, password: true }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Enter a valid email and password." });
      return;
    }
    const email = parsed.data.email.toLowerCase();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      res.status(401).json({ error: "Email or password is incorrect." });
      return;
    }
    attempts.delete(key);
    const token = await createSession(user.id);
    setSessionCookie(res, token);
    const [application] = await db.select().from(organiserApplicationsTable).where(eq(organiserApplicationsTable.userId, user.id)).limit(1);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, organiserStatus: application?.status ?? "not_started", organisationName: application?.organisationName ?? null });
  } catch (error) { next(error); }
});

router.post("/auth/logout", requireUser, async (req, res, next) => {
  try { await clearSession(req, res); res.status(204).end(); } catch (error) { next(error); }
});

router.get("/account/me", requireUser, async (_req, res, next) => {
  try {
    const account = res.locals.account as typeof usersTable.$inferSelect;
    const [application] = await db.select().from(organiserApplicationsTable).where(eq(organiserApplicationsTable.userId, account.id)).limit(1);
    res.json({ id: account.id, name: account.name, email: account.email, phone: account.phone, role: account.role, marketingConsent: account.marketingConsent, organiserStatus: application?.status ?? "not_started", organisationName: application?.organisationName ?? null });
  } catch (error) { next(error); }
});

router.patch("/account/preferences", requireUser, async (req, res, next) => {
  try {
    const body = z.object({ marketingConsent: z.boolean() }).parse(req.body);
    const account = res.locals.account as typeof usersTable.$inferSelect;
    await db.update(usersTable).set({ marketingConsent: body.marketingConsent }).where(eq(usersTable.id, account.id));
    res.json({ marketingConsent: body.marketingConsent });
  } catch (error) { next(error); }
});

router.patch("/account/profile", requireUser, async (req, res, next) => {
  try {
    const body = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(40).nullable(), marketingConsent: z.boolean() }).parse(req.body);
    const account = res.locals.account as typeof usersTable.$inferSelect;
    const [updated] = await db.update(usersTable).set({ name: body.name, phone: body.phone, marketingConsent: body.marketingConsent }).where(eq(usersTable.id, account.id)).returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, role: usersTable.role, marketingConsent: usersTable.marketingConsent });
    res.json(updated);
  } catch (error) { next(error); }
});

router.post("/auth/forgot-password", async (req, res, next) => {
  try {
    if (rateLimited(`forgot:${req.ip ?? "unknown"}`)) { res.status(429).json({ error: "Too many requests. Try again later." }); return; }
    const body = z.object({ email: z.string().trim().email().max(254) }).safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "Enter a valid email address." }); return; }
    const email = body.data.email.toLowerCase();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (user) {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(passwordResetsTable).values({ tokenHash, userId: user.id, expiresAt });
      const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:8000";
      const resetUrl = `${webOrigin}/reset-password?token=${token}`;
      void deliverEmail({ to: user.email, subject: "Reset your Out There ZA password", html: passwordResetEmail({ name: user.name, resetUrl }), entityType: "user", entityId: user.id });
    }
    res.json({ message: "If an account exists with that email, a reset link has been sent." });
  } catch (error) { next(error); }
});

router.post("/auth/reset-password", async (req, res, next) => {
  try {
    if (rateLimited(`reset:${req.ip ?? "unknown"}`)) { res.status(429).json({ error: "Too many requests. Try again later." }); return; }
    const body = z.object({ token: z.string().min(16).max(200), password: z.string().min(8).max(128) }).safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "Enter a valid reset token and a password of at least 8 characters." }); return; }
    const tokenHash = hashToken(body.data.token);
    const [reset] = await db.select().from(passwordResetsTable).where(and(eq(passwordResetsTable.tokenHash, tokenHash), isNull(passwordResetsTable.usedAt), gt(passwordResetsTable.expiresAt, new Date()))).limit(1);
    if (!reset) { res.status(400).json({ error: "This reset link is invalid or has expired." }); return; }
    await db.transaction(async (tx) => {
      await tx.update(usersTable).set({ passwordHash: await hashPassword(body.data.password) }).where(eq(usersTable.id, reset.userId));
      await tx.update(passwordResetsTable).set({ usedAt: new Date() }).where(eq(passwordResetsTable.tokenHash, tokenHash));
      await tx.delete(sessionsTable).where(eq(sessionsTable.userId, reset.userId));
    });
    res.json({ message: "Your password has been reset. You can now sign in." });
  } catch (error) { next(error); }
});

export default router;
