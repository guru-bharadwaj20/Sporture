import { beforeAll, afterAll, afterEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mem;

beforeAll(async () => {
  mem = await MongoMemoryServer.create();

  // Must be set before anything imports config/env.js, which validates these
  // at module load and exits the process if they are missing.
  process.env.NODE_ENV = "test";
  process.env.MONGO_URI = mem.getUri();
  process.env.JWT_SECRET = "test-secret-that-is-definitely-long-enough-to-pass-validation";
  process.env.CLIENT_ORIGINS = "http://localhost:5173";
  process.env.BACKEND_URL = "http://localhost:5000";

  await mongoose.connect(mem.getUri());
});

// Isolate tests from each other without paying to restart the server.
afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mem?.stop();
});
