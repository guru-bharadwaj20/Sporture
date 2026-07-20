// server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./config/env.js";
import connectDB from "./config/db.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userroutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust the first proxy hop so rate limiting keys off the real client IP
// when deployed behind a load balancer.
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Explicit origin allowlist instead of the previous open `cors()`.
app.use(
  cors({
    origin: (origin, cb) => {
      // Requests with no Origin header (curl, same-origin, health checks) pass.
      if (!origin || config.clientOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads"), { maxAge: "7d" }));

await connectDB();

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), env: config.nodeEnv });
});

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/events", eventRoutes);

app.get("/", (req, res) => res.send("Sporture API running"));

// Must be registered last, after every route.
app.use(notFound);
app.use(errorHandler);

const server = app.listen(config.port, () =>
  console.log(`Server running at http://localhost:${config.port} [${config.nodeEnv}]`)
);

// Don't leave the process in an undefined state after an unhandled rejection.
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection, shutting down:", err);
  server.close(() => process.exit(1));
});

export default app;
