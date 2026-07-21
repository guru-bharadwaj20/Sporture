import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    pool: "forks",
    testTimeout: 30000,
    hookTimeout: 120000,
    env: {
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      include: ["routes/**", "controllers/**", "middleware/**", "models/**", "validators/**"],
    },
  },
});
