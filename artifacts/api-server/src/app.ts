import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be configured in production.");
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const isProduction = process.env.NODE_ENV === "production";
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:8000";
app.use(cors({ origin: isProduction ? webOrigin : true, credentials: true }));
app.use(cookieParser(process.env.SESSION_SECRET ?? "development-only-change-me"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in a minute." },
});
app.use("/api", apiLimiter);

app.use("/api", router);

// Serve the built frontend (single-service deployment, e.g. Render web service).
// The frontend build output lives at artifacts/sa-ticketing/dist/public. When that
// directory exists we serve it as static assets and fall back to index.html for
// client-side routing, so one process serves both the API and the SPA.
const frontendDist = process.env.FRONTEND_DIST_DIR
  ? path.resolve(process.env.FRONTEND_DIST_DIR)
  : path.resolve(process.cwd(), "artifacts/sa-ticketing/dist/public");

if (existsSync(path.join(frontendDist, "index.html"))) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((err: unknown, _req: import("express").Request, res: import("express").Response, _next: import("express").NextFunction) => {
  if (err instanceof z.ZodError) {
    const fields = err.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`);
    res.status(400).json({ error: fields[0] ?? "Some fields are invalid.", fields });
    return;
  }
  const status = typeof err === "object" && err !== null && "status" in err && typeof err.status === "number" ? err.status : 500;
  if (status >= 500) logger.error({ err }, "API request failed");
  const message = status >= 500 ? "The server could not complete this request." : err instanceof Error ? err.message : "Request failed.";
  res.status(status).json({ error: message });
});

export default app;