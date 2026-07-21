import dotenv from "dotenv";

export interface Config {
  port: number;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  nodeEnv: string;
  backendUrl: string;
  clientOrigins: string[];
}

export const isTestEnv = (): boolean =>
  process.env.NODE_ENV === "test" || process.env.VITEST !== undefined;

const TEST_FALLBACKS = {
  MONGO_URI: "mongodb://127.0.0.1:27017/sporture-test",
  JWT_SECRET: "sporture-test-secret-not-used-outside-automated-tests",
} as const;

if (isTestEnv()) {
  dotenv.config({ path: ".env.test", quiet: true });
} else {
  dotenv.config({ quiet: true });
}

export const collectConfigErrors = (
  env: NodeJS.ProcessEnv = process.env
): string[] => {
  const errors: string[] = [];

  if (!env.MONGO_URI) {
    errors.push("MONGO_URI is required. Copy .env.example to .env and fill it in.");
  }

  if (!env.JWT_SECRET) {
    errors.push("JWT_SECRET is required. Copy .env.example to .env and fill it in.");
  } else if (env.JWT_SECRET.length < 32) {
    errors.push(
      "JWT_SECRET must be at least 32 characters. Generate one with: " +
        "node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    );
  }

  return errors;
};

const resolveConfig = (): Config => {
  const testing = isTestEnv();

  return {
    port: Number(process.env.PORT) || 5000,
    mongoUri:
      process.env.MONGO_URI || (testing ? TEST_FALLBACKS.MONGO_URI : ""),
    jwtSecret:
      process.env.JWT_SECRET || (testing ? TEST_FALLBACKS.JWT_SECRET : ""),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
    nodeEnv: process.env.NODE_ENV || "development",
    backendUrl: process.env.BACKEND_URL || "http://localhost:5000",
    clientOrigins: (process.env.CLIENT_ORIGINS || "http://localhost:5173")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  };
};

export const config: Config = resolveConfig();

export const assertValidConfig = (): void => {
  const errors = collectConfigErrors();
  if (errors.length === 0) return;

  console.error(
    `Invalid configuration:\n${errors.map((e) => `  - ${e}`).join("\n")}`
  );
  process.exit(1);
};
