import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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