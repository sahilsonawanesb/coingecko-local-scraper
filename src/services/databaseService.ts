// / Handles all PostgreSQL database operations
// Uses your existing database.ts code

import postgres from "postgres";
import { appConfig } from "../config/environment.js";
import { logger } from "./loggerService.js";

type CoinRow = {
  rank: number;
  name: string;
  symbol: string;
  price_usd: number;
  volume_usd: number | null;
  change_pct: number;
  source: string;
};

// Single database connection (reused across app)
let sqlConnection: any = null;

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info(
      "DatabaseService",
      "Initializing PostgreSQL connection",
      {
        host: appConfig.database.host,
        port: appConfig.database.port,
        database: appConfig.database.database,
      }
    );

    sqlConnection = postgres({
      host: appConfig.database.host,
      port: appConfig.database.port,
      username: appConfig.database.user,
      password: appConfig.database.password,
      database: appConfig.database.database,
      ssl: false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Test connection
    await sqlConnection`SELECT NOW()`;
    logger.info("DatabaseService", "PostgreSQL connected successfully");
  } catch (error: any) {
    logger.error("DatabaseService", "Failed to connect to PostgreSQL", error);
    throw error;
  }
}

// Get database connection
export function getDatabase() {
  if (!sqlConnection) {
    throw new Error("Database not initialized");
  }
  return sqlConnection;
}

// Normalize and validate a coin row
function normalizeRow(row: CoinRow): CoinRow | null {
  const safeNumber = (v: any, fallback: number | null = null): number | null => {
    if (v === null || v === undefined) return fallback;
    const num = typeof v === "number" ? v : Number(v);
    if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
    return num;
  };

  const normalized: CoinRow = {
    rank: safeNumber(row.rank, 0) ?? 0,
    name: String(row.name || "").trim(),
    symbol: String(row.symbol || "UNKNOWN").trim().toUpperCase(),
    price_usd: safeNumber(row.price_usd, 0) ?? 0,
    volume_usd: safeNumber(row.volume_usd, null),
    change_pct: safeNumber(row.change_pct, 0) ?? 0,
    source: "coingecko",
  };

  // Validation
  if (!normalized.name || normalized.name.length < 2) {
    return null;
  }

  if (!normalized.symbol || normalized.symbol === "UNKNOWN") {
    return null;
  }

  if (normalized.price_usd < 0) {
    return null;
  }

  return normalized;
}

// Insert coins into specific table
export async function insertCoinsIntoTable(
  tableName: string,
  coins: CoinRow[]
): Promise<{ inserted: number; failed: number }> {
  if (!coins || coins.length === 0) {
    logger.warn("DatabaseService", `No data to insert into ${tableName}`);
    return { inserted: 0, failed: 0 };
  }

  try {
    logger.info("DatabaseService", `Inserting ${coins.length} coins into ${tableName}`);

    const sql = getDatabase();
    const sanitized = coins
      .map((row) => normalizeRow(row))
      .filter((row): row is CoinRow => row !== null);

    if (sanitized.length === 0) {
      logger.warn("DatabaseService", `All rows were invalid for ${tableName}`);
      return { inserted: 0, failed: coins.length };
    }

    const insertData = sanitized.map((r) => ({
      rank: r.rank,
      name: r.name,
      symbol: r.symbol,
      price_usd: r.price_usd,
      volume_usd: r.volume_usd,
      change_pct: r.change_pct,
    }));

    // Perform insert
    const result = await sql.begin(async (tx: any) => {
      const response = await tx`
        INSERT INTO ${sql(tableName)} 
        ${sql(insertData)}
        RETURNING symbol
      `;
      return response;
    });

    logger.info(
      "DatabaseService",
      `Inserted ${result.length} coins into ${tableName}`
    );
    return { inserted: result.length, failed: sanitized.length - result.length };
  } catch (error: any) {
    logger.error("DatabaseService", `Failed to insert into ${tableName}`, error);
    return { inserted: 0, failed: coins.length };
  }
}

// Main function to insert all data
export async function insertAllCoinData(
  timeframe: "1h" | "24h",
  gainers: CoinRow[],
  losers: CoinRow[]
): Promise<{
  success: boolean;
  gainers_inserted: number;
  losers_inserted: number;
  message: string;
}> {
  try {
    logger.info("DatabaseService", `Starting ${timeframe} data insertion`);

    const gainersTable = `gainers_${timeframe}`;
    const losersTable = `losers_${timeframe}`;

    const gainersResult = await insertCoinsIntoTable(gainersTable, gainers);
    const losersResult = await insertCoinsIntoTable(losersTable, losers);

    const totalInserted = gainersResult.inserted + losersResult.inserted;

    logger.info(
      "DatabaseService",
      `✓ ${timeframe} insertion complete`,
      {
        gainers: gainersResult.inserted,
        losers: losersResult.inserted,
        total: totalInserted,
      }
    );

    return {
      success: true,
      gainers_inserted: gainersResult.inserted,
      losers_inserted: losersResult.inserted,
      message: `Inserted ${totalInserted} coins`,
    };
  } catch (error: any) {
    logger.error("DatabaseService", `${timeframe} insertion failed`, error);
    return {
      success: false,
      gainers_inserted: 0,
      losers_inserted: 0,
      message: `Error: ${error.message}`,
    };
  }
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  if (sqlConnection) {
    try {
      await sqlConnection.end();
      logger.info("DatabaseService", "Database connection closed");
    } catch (error: any) {
      logger.error("DatabaseService", "Failed to close database", error);
    }
  }
}