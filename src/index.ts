// // Main entry point - starts everything

// import express from "express";
// import cron from "node-cron";
// import { appConfig } from "./config/environment.js";
// import { logger } from "./services/loggerService.js";
// import { initializeDatabase, closeDatabase } from "./services/databaseService.js";
// import { run1HourJob } from "./jobs/workflow-1h.js";
// import { run24HourJob } from "./jobs/workflow-24.js";
// import healthRoutes from "./routes/health.routes.js";

// // Initialize Express app
// const app = express();
// app.use(express.json());

// // Mount health routes
// app.use("/api", healthRoutes);

// // Schedule cron jobs
// function scheduleCronJobs(): void {
//   logger.info("Scheduler", "Setting up cron jobs");

//   // Run 1H job every hour at minute 0
//   // Pattern: 0 * * * * (minute 0, every hour)
//   cron.schedule("0 * * * *", () => {
//     logger.info("Scheduler", "Triggering 1H job");
//     run1HourJob().catch((error) => {
//       logger.error("Scheduler", "1H job error", error);
//     });
//   });

//   logger.info("Scheduler", "1H cron job scheduled (every hour)");


//   // // Testing 1H job every 1 minute just for testing purpose.
//   // cron.schedule("* * * * *", () => {
//   //   logger.info("Scheduler", "Triggering 1H job");
//   //   run1HourJob().catch((error) => {
//   //     logger.error("Scheduler", "1h job error", error);
//   //   });
//   // });


//   // Run 24H job every day at midnight
//   // Pattern: 0 0 * * * (minute 0, hour 0, every day)
//   cron.schedule("0 0 * * *", () => {
//     logger.info("Scheduler", "Triggering 24H job");
//     run24HourJob().catch((error) => {
//       logger.error("Scheduler", "24H job error", error);
//     });
//   });

//   logger.info("Scheduler", "24H cron job scheduled (every day at midnight)");
// }

// // Graceful shutdown
// async function shutdown(): Promise<void> {
//   logger.info("App", "Shutting down gracefully");
//   await closeDatabase();
//   process.exit(0);
// }

// process.on("SIGINT", shutdown);
// process.on("SIGTERM", shutdown);

// // Start application
// async function startApp(): Promise<void> {
//   try {
//     logger.info("App", "Starting CoinGecko Local Scraper");
//     logger.info("App", `Environment: ${appConfig.nodeEnv}`);
//     logger.info("App", `Database: ${appConfig.database.host}:${appConfig.database.port}`);

//     // Initialize database
//     await initializeDatabase();

//     // Setup cron jobs
//     scheduleCronJobs();

//     // Start Express server
//     app.listen(appConfig.port, () => {
//       logger.info("App", `Server running on http://localhost:${appConfig.port}`);
//       logger.info("App", `Health check: http://localhost:${appConfig.port}/api/health`);
//     });
//   } catch (error: any) {
//     logger.error("App", "Failed to start application", error);
//     process.exit(1);
//   }
// }

// // Run application
// startApp();




// Main entry point - starts everything

import express from "express";
import cron from "node-cron";
import { appConfig } from "./config/environment.js";
import { logger } from "./services/loggerService.js";
import { initializeDatabase, closeDatabase } from "./services/databaseService.js";
import { run1HourJob } from "./jobs/workflow-1h.js";
import { run24HourJob } from "./jobs/workflow-24.js";
import healthRoutes from "./routes/health.routes.js";

// Initialize Express app
const app = express();
app.use(express.json());

// Mount health routes
app.use("/api", healthRoutes);

// Schedule cron jobs
function scheduleCronJobs(): void {
  logger.info("Scheduler", "Setting up cron jobs");

  // Run 1H job every hour at minute 0
  // Pattern: 0 * * * * (minute 0, every hour)
  cron.schedule("0 * * * *", () => {
    logger.info("Scheduler", "Triggering 1H job");
    run1HourJob().catch((error) => {
      logger.error("Scheduler", "1H job error", error);
    });
  });

  logger.info("Scheduler", "1H cron job scheduled (runs every hour at :00)");

  // Run 24H job every day at midnight
  // Pattern: 0 0 * * * (minute 0, hour 0, every day)
  cron.schedule("0 0 * * *", () => {
    logger.info("Scheduler", "Triggering 24H job");
    run24HourJob().catch((error) => {
      logger.error("Scheduler", "24H job error", error);
    });
  });

  logger.info("Scheduler", "24H cron job scheduled (runs daily at midnight)");
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info("App", "Shutting down gracefully");
  await closeDatabase();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start application
async function startApp(): Promise<void> {
  try {
    logger.info("App", "========");
    logger.info("App", "Starting CoinGecko Local Scraper");
    logger.info("App", "========");
    logger.info("App", `Environment: ${appConfig.nodeEnv}`);
    logger.info("App", `Database: ${appConfig.database.host}:${appConfig.database.port}/${appConfig.database.database}`);
    logger.info("App", `Port: ${appConfig.port}`);

    // Initialize database (also creates tables if they don't exist)
    await initializeDatabase();
    logger.info("App", "Database initialized and tables ensured");

    // Setup cron jobs
    scheduleCronJobs();

    // Start Express server
    app.listen(appConfig.port, () => {
      logger.info("App", "======");
      logger.info("App", ` Server running on http://localhost:${appConfig.port}`);
      logger.info("App", `Health check: http://localhost:${appConfig.port}/api/health`);
      logger.info("App", "======");
      logger.info("App", "Ready to scrape CoinGecko data!");
    });
  } catch (error: any) {
    logger.error("App", "Failed to start application", error);
    process.exit(1);
  }
}

// Run application
startApp();




