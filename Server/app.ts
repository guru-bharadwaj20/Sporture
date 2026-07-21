import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./config/env.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userroutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = (): Express => {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || config.clientOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));

  app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "7d" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), env: config.nodeEnv });
  });

  if (config.nodeEnv !== "test") {
    app.use("/api", apiLimiter);
  }

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/feedback", feedbackRoutes);
  app.use("/api/events", eventRoutes);

  app.get("/", (_req, res) => {
    res.send("Sporture API running");
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
