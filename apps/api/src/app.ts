import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { mailboxRouter, oauthRouter } from "./routes/mailbox.js";
import { scansRouter } from "./routes/scans.js";
import {
  auditRouter,
  candidatesRouter,
  entitiesRouter,
} from "./routes/candidates.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.webBaseUrl,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "email-task-agent",
      civisightPosting: config.civisight.enabled,
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/mailboxes", mailboxRouter);
  app.use("/api/oauth", oauthRouter);
  app.use("/api/scans", scansRouter);
  app.use("/api/candidates", candidatesRouter);
  app.use("/api/entities", entitiesRouter);
  app.use("/api/audit", auditRouter);

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({ error: err.message || "Internal server error" });
    },
  );

  return app;
}
