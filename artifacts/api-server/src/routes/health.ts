import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await pool.query("SELECT 1");
    checks.database = "up";
  } catch {
    checks.database = "down";
    healthy = false;
  }

  checks.email = process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "configured" : "not_configured";
  checks.payfast = process.env.PAYFAST_ENCRYPTION_SECRET && process.env.PAYFAST_NOTIFY_URL ? "configured" : "not_configured";
  checks.session = process.env.SESSION_SECRET ? "configured" : "not_configured";

  if (healthy) {
    res.json({ status: "ok", checks });
  } else {
    res.status(503).json({ status: "database_unavailable", checks });
  }
});

export default router;