import dotenv from "dotenv";

dotenv.config();

/* =======================
   Interfaces
======================= */

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionString: string;
}

interface AppConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  database: DatabaseConfig;
  scraperTimeout: number;
  headless: boolean;
}

/* =======================
   Helper
======================= */

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? defaultValue ?? "";
};

/* =======================
   Database Config
======================= */

// Read env vars ONCE (important)
const dbHost = getEnv("DATABASE_HOST", "localhost");
const dbPort = parseInt(getEnv("DATABASE_PORT", "5432"), 10);
const dbUser = getEnv("DATABASE_USER");
const dbPassword = getEnv("DATABASE_PASSWORD");
const dbName = getEnv("DATABASE_NAME");

// Encode password to handle @, #, !, etc.
const encodedPassword = encodeURIComponent(dbPassword);

const databaseConfig: DatabaseConfig = {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  connectionString: `postgres://${dbUser}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}`,
};

/* =======================
   App Config
======================= */

export const appConfig: AppConfig = {
  nodeEnv: getEnv("NODE_ENV", "development"),
  port: parseInt(getEnv("PORT", "3000"), 10),
  logLevel: getEnv("LOG_LEVEL", "info"),
  database: databaseConfig,
  scraperTimeout: parseInt(getEnv("SCRAPER_TIMEOUT_MS", "180000"), 10),
  headless: getEnv("HEADLESS", "true") !== "false",
};

/* =======================
   Validation
======================= */

if (
  !databaseConfig.host ||
  !databaseConfig.user ||
  !databaseConfig.password ||
  !databaseConfig.database
) {
  throw new Error("Database configuration is incomplete");
}

/* =======================
   Debug (SAFE)
======================= */

console.log("[CONFIG] Loaded config", {
  env: appConfig.nodeEnv,
  dbHost: databaseConfig.host,
  dbPort: databaseConfig.port,
  dbName: databaseConfig.database,
  headless: appConfig.headless,
});

export default appConfig;
