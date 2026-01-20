// Wrapper around your scraper code
// Adds error handling and logging

import { scrapeCoingecko24H, scrapeCoingecko1H } from "../modules/scraperService.js";
// import scrapeCoingecko1h, scrapeCoingecko24H from "../modules/scraperService";
import { logger } from "./loggerService.js";

export type CoinRow = {
  rank: number;
  name: string;
  symbol: string;
  price_usd: number;
  volume_usd: number | null;
  change_pct: number;
  source: string;
};

export type ScrapedData = {
  gainers_1h: CoinRow[];
  losers_1h: CoinRow[];
  gainers_24h: CoinRow[];
  losers_24h: CoinRow[];
  scrapedAt: Date;
};


export type ScrapedData1H = {
  gainers: CoinRow[];
  losers: CoinRow[];
  timeframe: "1h";
  scrapedAt: Date;
};

export type ScrapedData24H = {
  gainers: CoinRow[];
  losers: CoinRow[];
  timeframe: "24h";
  scrapedAt: Date;
};


// // Wrapper function
// export async function scrapeData(): Promise<ScrapedData | null> {
//   try {
//     logger.info("ScraperService", "Starting scrape operation");

//     const startTime = Date.now();
//     const result = await scrapeCoingecko();
//     const duration = (Date.now() - startTime) / 1000;

//     logger.info(
//       "ScraperService",
//       `Scrape completed in ${duration.toFixed(2)}s`,
//       {
//         gainers_1h: result.gainers1h.length,
//         losers_1h: result.losers1h.length,
//         gainers_24h: result.gainers24h.length,
//         losers_24h: result.losers24h.length,
//       }
//     );

//     return {
//       gainers_1h: result.gainers1h,
//       losers_1h: result.losers1h,
//       gainers_24h: result.gainers24h,
//       losers_24h: result.losers24h,
//       scrapedAt: result.scrapedAt,
//     };
//   } catch (error: any) {
//     logger.error("ScraperService", "Scrape failed", error);
//     return null;
//   }
// }

// Scrape 1-hour data only
export async function scrapeData1H(): Promise<ScrapedData1H | null> {
  try {
    logger.info("ScraperService1H", "Starting 1H scrape operation");

    const startTime = Date.now();
    const result = await scrapeCoingecko1H();
    const duration = (Date.now() - startTime) / 1000;

    logger.info(
      "ScraperService1H",
      `1H scrape completed in ${duration.toFixed(2)}s`,
      {
        gainers: result.gainers.length,
        losers: result.losers.length,
      }
    );

    return result;
  } catch (error: any) {
    logger.error("ScraperService1H", "1H scrape failed", error);
    return null;
  }
}

export async function scrapeData24H(): Promise<ScrapedData24H | null> {
  try {
    logger.info("ScraperService24H", "Starting 24H scrape operation");

    const startTime = Date.now();
    const result = await scrapeCoingecko24H();
    const duration = (Date.now() - startTime) / 1000;

    logger.info(
      "ScraperService24H",
      `24H scrape completed in ${duration.toFixed(2)}s`,
      {
        gainers: result.gainers.length,
        losers: result.losers.length,
      }
    );

    return result;
  } catch (error: any) {
    logger.error("ScraperService24H", "24H scrape failed", error);
    return null;
  }
}

// Scrape both 1h and 24h data.
export async function scrapeAllData() : Promise<ScrapedData | null>{
  try{
    logger.info("ScraperService", "Starting combined scrape operation (1H + 24H)");

    const startTime = Date.now();

    // Run both scrapers in parallel
    const [result1h, result24h] = await Promise.all([
      scrapeCoingecko1H(),
      scrapeCoingecko24H(),
    ]);
    
    const duration = (Date.now() - startTime) / 1000;

    logger.info(
      "ScraperService",
      `Combined scrape completed in ${duration.toFixed(2)}s`,
      {
        gainers_1h: result1h.gainers.length,
        losers_1h: result1h.losers.length,
        gainers_24h: result24h.gainers.length,
        losers_24h: result24h.losers.length,
      }
    );

    return {
      gainers_1h: result1h.gainers,
      losers_1h: result1h.losers,
      gainers_24h: result24h.gainers,
      losers_24h: result24h.losers,
      scrapedAt: new Date(), 
    };

  }catch(error : any){
    logger.error("ScraperService", "Combined scrape failed", error);
    return null;
  }
}