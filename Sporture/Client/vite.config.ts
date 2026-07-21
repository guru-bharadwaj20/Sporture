/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Shared API contract, also imported by the server. Type-only, so it
      // contributes nothing to the bundle.
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    // Vite refuses to serve files outside the project root unless told to.
    fs: { allow: [path.resolve(__dirname, ".."), path.resolve(__dirname)] },
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false, // components import .css; jsdom doesn't need it parsed
    // Page tests drive real interactions — userEvent types character by
    // character with a delay between each — so a form with five fields can
    // take several seconds. Vitest's 5s default made those flake under the
    // parallel load of the whole suite while passing in isolation. Still
    // short enough that an actual deadlock fails quickly.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/components/**"],
      exclude: ["src/components/**/*.css", "src/test/**"],
    },
  },
});
