// Executes once per day (at midnight)
// Scrapes 24H data and inserts to database

// import { scrapeData } from "../services/scraperService.js";
import { scrapeData24H } from "../services/scraperService.js";
import { insertAllCoinData } from "../services/databaseService.js";
import { logger } from "../services/loggerService.js";

export async function run24HourJob(): Promise<void> {
  const jobStartTime = new Date();

  try {
    logger.info("Job-24H", "Starting 24 hour job");

    // Step 1: Scrape data
    const scrapedData = await scrapeData24H();
    if (!scrapedData) {
      logger.error("Job-24H", "Failed to scrape data");
      return;
    }

    // Step 2: Insert to database
    const result = await insertAllCoinData(
      "24h",
      scrapedData.gainers,
      scrapedData.losers
    );

    if (!result.success) {
      logger.error("Job-24H", "Failed to insert data to database");
      return;
    }

    const duration = (new Date().getTime() - jobStartTime.getTime()) / 1000;

    logger.info(
      "Job-24H",
      `24H job completed successfully in ${duration.toFixed(2)}s`,
      result
    );
  } catch (error: any) {
    logger.error("Job-24H", "Job failed", error);
  }
}