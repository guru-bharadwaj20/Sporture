import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    // Each file gets its own in-memory MongoDB, so files must not share a
    // process or they will fight over the mongoose connection.
    pool: "forks",
    testTimeout: 30000,
    hookTimeout: 120000, // first run downloads the mongod binary
    coverage: {
      provider: "v8",
      include: ["routes/**", "controllers/**", "middleware/**", "models/**", "validators/**"],
    },
  },
});
