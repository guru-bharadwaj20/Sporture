// server.ts — process entry point: connect to MongoDB, then start listening.
// The app itself is built in app.ts so tests can use it without a live server.
import { config } from "./config/env.js";
import connectDB from "./config/db.js";
import { createApp } from "./app.js";

await connectDB();

const app = createApp();

const server = app.listen(config.port, () =>
  console.log(`Server running at http://localhost:${config.port} [${config.nodeEnv}]`)
);

const shutdown = (signal: string): void => {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Don't leave the process running in an undefined state.
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection, shutting down:", err);
  server.close(() => process.exit(1));
});

export default app;
