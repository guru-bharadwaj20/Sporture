import dotenv from "dotenv";

dotenv.config();

/**
 * Fail loudly at boot if configuration is missing or unsafe, rather than
 * discovering it when the first request hits. A missing JWT_SECRET in
 * particular would otherwise make jwt.sign throw at runtime, per-request.
 */
const required = ["MONGO_URI", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(
    `Missing required environment variable(s): ${missing.join(", ")}\n` +
      `Copy .env.example to .env and fill them in.`
  );
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error(
    "JWT_SECRET is too short. Use at least 32 random characters — " +
      "generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
  );
  process.exit(1);
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || "development",
  backendUrl: process.env.BACKEND_URL || "http://localhost:5000",
  // Comma-separated list of origins permitted to call the API.
  clientOrigins: (process.env.CLIENT_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};
