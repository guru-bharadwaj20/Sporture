import dotenv from "dotenv";

dotenv.config({ quiet: true });

const REQUIRED = ["MONGO_URI", "JWT_SECRET"] as const;

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missing.join(", ")}\n` +
      `Copy .env.example to .env and fill them in.`
  );
  process.exit(1);
}

const jwtSecret = process.env.JWT_SECRET as string;
const mongoUri = process.env.MONGO_URI as string;

if (jwtSecret.length < 32) {
  console.error(
    "JWT_SECRET is too short. Use at least 32 random characters — " +
      "generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
  );
  process.exit(1);
}

export interface Config {
  port: number;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  nodeEnv: string;
  backendUrl: string;
  clientOrigins: string[];
}

export const config: Config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  nodeEnv: process.env.NODE_ENV || "development",
  backendUrl: process.env.BACKEND_URL || "http://localhost:5000",
  clientOrigins: (process.env.CLIENT_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};
