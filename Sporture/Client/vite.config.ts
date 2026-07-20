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
});
