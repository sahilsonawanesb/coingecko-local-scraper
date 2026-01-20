// Executes every 1 hour
// Scrapes 1H data and inserts to database

// import { scrapeData } from "../services/scraperService.js";
import {scrapeData1H} from "../services/scraperService.js";
import { insertAllCoinData } from "../services/databaseService.js";
import { logger } from "../services/loggerService.js";

export async function run1HourJob(): Promise<void> {
  const jobStartTime = new Date();

  try {
    logger.info("Job-1H", "Starting 1 hour job");

    // Step 1: Scrape data
    const scrapedData = await scrapeData1H();
    if (!scrapedData) {
      logger.error("Job-1H", "Failed to scrape data");
      return;
    }

    // Step 2: Insert to database
    const result = await insertAllCoinData(
      "1h",
      scrapedData.gainers,
      scrapedData.losers
    );

    if (!result.success) {
      logger.error("Job-1H", "Failed to insert data to database");
      return;
    }

    const duration = (new Date().getTime() - jobStartTime.getTime()) / 1000;

    logger.info(
      "Job-1H",
      `1H job completed successfully in ${duration.toFixed(2)}s`,
      result
    );
  } catch (error: any) {
    logger.error("Job-1H", "Job failed", error);
  }
}
