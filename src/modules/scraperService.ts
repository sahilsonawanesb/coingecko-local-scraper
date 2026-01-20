import { chromium, Browser, Page } from "playwright";

//  Types
type CoinRow = {
  rank: number;
  name: string;
  symbol: string;
  price_usd: number;
  volume_usd: number | null;
  change_pct: number;
  source: string;
};

// type ScrapeResult = {
//   gainers1h: CoinRow[];
//   losers1h: CoinRow[];
//   gainers24h: CoinRow[];
//   losers24h: CoinRow[];
//   scrapedAt: Date;
// };

type  ScrapeResult1h = {
  gainers : CoinRow[];
  losers : CoinRow[];
  timeframe : "1h";
  scrapedAt : Date;
}

type ScrapeResult24h = {
  gainers : CoinRow[];
  losers : CoinRow[];
  timeframe : "24h";
  scrapedAt : Date;
}

/* Constants */
const COINGECKO_URL = "https://www.coingecko.com/en/crypto-gainers-losers?top=all";
const PAGE_TIMEOUT = 120_000;
const CLOUDFLARE_TIMEOUT = 30_000;
const POST_NAVIGATION_WAIT = 3000;

/* Logger */
class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any) {
    console.log(
      `[${new Date().toISOString()}] [INFO] [${this.context}] ${message}`,
      data || ""
    );
  }

  error(message: string, error?: any) {
    console.error(
      `[${new Date().toISOString()}] [ERROR] [${this.context}] ${message}`,
      error || ""
    );
  }

  warn(message: string, data?: any) {
    console.warn(
      `[${new Date().toISOString()}] [WARN] [${this.context}] ${message}`,
      data || ""
    );
  }
}

/*  Utils */
function parseNumber(value: string | null): number {
  if (!value) return 0;
  let cleaned = value.trim();

  const multipliers: { [key: string]: number } = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
    T: 1_000_000_000_000,
  };

  const match = cleaned.match(/^[\$\€\£]?([\d,.]+)([KMBT])?/i);
  if (match) {
    const numStr = match[1].replace(/,/g, "");
    const suffix = match[2]?.toUpperCase();
    const base = parseFloat(numStr);
    if (isNaN(base)) return 0;
    return suffix && multipliers[suffix]
      ? base * multipliers[suffix]
      : base;
  }

  cleaned = cleaned.replace(/[^\d.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// function extractNameAndSymbol(cellText: string): {
//   name: string;
//   symbol: string;
// } {
//   const cleaned = cellText.trim();
//   const parts = cleaned
//     .split(/\n| +/)
//     .map((s) => s.trim())
//     .filter((s) => s.length > 0);

//   if (parts.length >= 2) {
//     return {
//       name: parts[0],
//       symbol: parts[parts.length - 1],
//     };
//   }

//   return {
//     name: cleaned,
//     symbol: "UNKNOWN",
//   };
// }


async function extractNameAndSymbol(cell: any, logger: Logger): Promise<{
  name: string;
  symbol: string;
}> {
  try {
    // Query the main name element (outer div with font-semibold class)
    const nameElement = await cell.$('div.tw-font-semibold');
    
    if (!nameElement) {
      logger.warn("Name element not found, falling back to text extraction");
      const fallbackText = await cell.textContent();
      return fallbackExtraction(fallbackText || "");
    }

    // Get the full text of the name element (includes nested symbol)
    const fullText = await nameElement.textContent();
    
    // Query the nested symbol element (div with gray text color)
    const symbolElement = await nameElement.$('div.tw-text-gray-500, div.tw-text-moon-200');
    
    let symbol = "UNKNOWN";
    let name = fullText?.trim() || "";

    if (symbolElement) {
      const symbolText = await symbolElement.textContent();
      symbol = symbolText?.trim().replace(/^\$/, "") || "UNKNOWN"; // Remove $ prefix
      
      // Remove the symbol from the full text to get clean name
      if (symbolText) {
        name = name.replace(symbolText.trim(), "").trim();
      }
    } else {
      // Fallback: try to extract from full text
      const parts = fullText?.split(/\n/).map((s : any)  => s.trim()).filter((s : any) => s.length > 0) || [];
      if (parts.length >= 2) {
        name = parts[0];
        symbol = parts[1].replace(/^\$/, "");
      }
    }

    return { name, symbol };
  } catch (error) {
    logger.warn("Error extracting name and symbol, using fallback", error);
    const fallbackText = await cell.textContent();
    return fallbackExtraction(fallbackText || "");
  }
}

/* Fallback extraction for when DOM structure fails */
function fallbackExtraction(text: string): { name: string; symbol: string } {
  const cleaned = text.trim();
  const parts = cleaned
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (parts.length >= 2) {
    const name = parts[0];
    const symbol = parts[parts.length - 1].replace(/^\$/, "");
    return { name, symbol };
  }

  return {
    name: cleaned,
    symbol: "UNKNOWN",
  };
}

/* Updated scrapeSectionData - only the name/symbol extraction part changes */
async function scrapeSectionData(
  page: Page,
  sectionType: "Top Gainers" | "Top Losers",
  logger: Logger
): Promise<CoinRow[]> {
  try {
    logger.info(`Scraping ${sectionType} section`);

    const headingEmoji = sectionType === "Top Gainers" ? "🚀" : "🚨";
    const heading = await page.$(`h2:has-text("${headingEmoji}")`);

    if (!heading) {
      logger.warn(`${sectionType} heading not found`);
      return [];
    }

    const tableHandle = await page.evaluateHandle((h) => {
      let next = h.nextElementSibling;
      while (next) {
        if (next.tagName === "TABLE") return next;
        const table = next.querySelector("table");
        if (table) return table;
        next = next.nextElementSibling;
      }
      return null;
    }, heading);

    const table = tableHandle.asElement();
    if (!table) {
      logger.warn(`Table not found for ${sectionType}`);
      return [];
    }

    const rows = await table.$$("tbody tr");
    logger.info(`Found ${rows.length} rows in ${sectionType} table`);

    const coins: CoinRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const cells = await row.$$("td");
        if (cells.length < 6) {
          logger.warn(`Row ${i + 1} has insufficient cells: ${cells.length}`);
          continue;
        }

  
// for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
//   const cellText = await cells[cellIdx].textContent();
//   logger.info(`Row ${i+1}, Cell ${cellIdx}: "${cellText?.substring(0, 50)}"`);
// }

        const rankText = await cells[1]?.textContent();
        // const rank = parseNumber(rankText) || i + 1;
        const rank = parseNumber(rankText) ?? null;

        // if(!rank){
        //   logger.warn(`Skipping row ${i + 1} due to invalid rank`);
        //   continue;
        // }

//         const rankDataSort = await cells[1].getAttribute("data-sort"); // Replace X with correct index
//         // const rankText = await cells[1].textContent();
// logger.info(`Row ${i+1} - Raw rank text: "${rankText}" | Parsed: ${parseNumber(rankText)}`);
//         console.log(rankDataSort);
//         logger.info(`Row ${i + 1} has ${cells.length} cells`);



        //Use new extraction method that queries DOM elements
        const { name, symbol } = await extractNameAndSymbol(cells[2], logger);

        const priceDataSort = await cells[3].getAttribute("data-sort");
        const priceText = await cells[3].textContent();
        const price = priceDataSort
          ? parseFloat(priceDataSort)
          : parseNumber(priceText);

        const volumeDataSort = await cells[4].getAttribute("data-sort");
        const volumeText = await cells[4].textContent();
        const volume = volumeDataSort
          ? parseFloat(volumeDataSort)
          : parseNumber(volumeText);

        const changeDataSort = await cells[5].getAttribute("data-sort");
        const changeText = await cells[5].textContent();
        const changePercent = changeDataSort
          ? parseFloat(changeDataSort)
          : parseNumber(changeText);

        coins.push({
          rank,
          name,
          symbol,
          price_usd: price,
          volume_usd: volume,
          change_pct: changePercent,
          source: "coingecko_ui",
        });

        logger.info(
          `Row ${i + 1}: ${name} (${symbol}) - Price: $${price} - Change: ${changePercent}%`
        );
      } catch (error) {
        logger.warn(`Failed to parse row ${i + 1}`, error);
        continue;
      }
    }

    logger.info(`Extracted ${coins.length} coins from ${sectionType}`);
    return coins;
  } catch (error) {
    logger.error(`Failed to scrape ${sectionType}`, error);
    return [];
  }
}

/* Cloudflare CAPTCHA Bypass */
async function waitForCloudflareChallenge(
  page: Page,
  logger: Logger
): Promise<boolean> {
  logger.info("Waiting for Cloudflare challenge...");

  try {
    await Promise.race([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
      page.waitForFunction(
        () => {
          const bodyText = document.body.innerText.toLowerCase();
          return (
            !bodyText.includes("checking your browser") &&
            !bodyText.includes("verifying") &&
            document.querySelectorAll("table").length > 0
          );
        },
        { timeout: CLOUDFLARE_TIMEOUT }
      ),
    ]);

    logger.info("Cloudflare challenge passed");
    return true;
  } catch (error) {
    logger.warn("Cloudflare challenge detection timeout", error);
    return false;
  }
}

async function isCloudflareBlock(page: Page): Promise<boolean> {
  try {
    const title = await page.title();
    const content = await page.content();

    return (
      title.toLowerCase().includes("challenge") ||
      content.toLowerCase().includes("checking your browser") ||
      content.toLowerCase().includes("please turn javascript on")
    );
  } catch {
    return false;
  }
}

/* Scraping Functions */
// async function scrapeSectionData(
//   page: Page,
//   sectionType: "Top Gainers" | "Top Losers",
//   logger: Logger
// ): Promise<CoinRow[]> {
//   try {
//     logger.info(`Scraping ${sectionType} section`);

//     const headingEmoji = sectionType === "Top Gainers" ? "🚀" : "🚨";
//     const heading = await page.$(`h2:has-text("${headingEmoji}")`);

//     if (!heading) {
//       logger.warn(`${sectionType} heading not found`);
//       return [];
//     }

//     const tableHandle = await page.evaluateHandle((h) => {
//       let next = h.nextElementSibling;
//       while (next) {
//         if (next.tagName === "TABLE") return next;
//         const table = next.querySelector("table");
//         if (table) return table;
//         next = next.nextElementSibling;
//       }
//       return null;
//     }, heading);

//     const table = tableHandle.asElement();
//     if (!table) {
//       logger.warn(`Table not found for ${sectionType}`);
//       return [];
//     }

//     const rows = await table.$$("tbody tr");
//     logger.info(`Found ${rows.length} rows in ${sectionType} table`);

//     const coins: CoinRow[] = [];

//     for (let i = 0; i < rows.length; i++) {
//       const row = rows[i];
//       try {
//         const cells = await row.$$("td");
//         if (cells.length < 6) {
//           logger.warn(`Row ${i + 1} has insufficient cells: ${cells.length}`);
//           continue;
//         }

//         const rankText = await cells[1].textContent();
//         const rank = parseNumber(rankText) || i + 1;

//         const nameSymbolText = await cells[2].textContent();
//         const { name, symbol } = extractNameAndSymbol(nameSymbolText || "");

//       //   const nameSymbolHTML = await cells[2].innerHTML();
//       //   logger.info(`Raw HTML for row ${i+1}:`, nameSymbolHTML);

//       //   // logger.info(`Split parts for row ${i + 1}:`, parts);
//       //   const nameElement = await cells[2].$('selector-for-name');
//       // const symbolElement = await cells[2].$('selector-for-symbol');
//       // console.log(nameElement);
//       // console.log(symbolElement);

//         const priceDataSort = await cells[3].getAttribute("data-sort");
//         const priceText = await cells[3].textContent();
//         const price = priceDataSort
//           ? parseFloat(priceDataSort)
//           : parseNumber(priceText);

//         const volumeDataSort = await cells[4].getAttribute("data-sort");
//         const volumeText = await cells[4].textContent();
//         const volume = volumeDataSort
//           ? parseFloat(volumeDataSort)
//           : parseNumber(volumeText);

//         const changeDataSort = await cells[5].getAttribute("data-sort");
//         const changeText = await cells[5].textContent();
//         const changePercent = changeDataSort
//           ? parseFloat(changeDataSort)
//           : parseNumber(changeText);

//         coins.push({
//           rank,
//           name,
//           symbol,
//           price_usd: price,
//           volume_usd: volume,
//           change_pct: changePercent,
//           source: "coingecko_ui",
//         });

//         logger.info(
//           `Row ${i + 1}: ${name} (${symbol}) - Price: $${price} - Change: ${changePercent}%`
//         );
//       } catch (error) {
//         logger.warn(`Failed to parse row ${i + 1}`, error);
//         continue;
//       }
//     }

//     logger.info(`Extracted ${coins.length} coins from ${sectionType}`);
//     return coins;
//   } catch (error) {
//     logger.error(`Failed to scrape ${sectionType}`, error);
//     return [];
//   }
// }

async function navigateToTimeframe(
  page: Page,
  timeframe: "h1" | "h24",
  logger: Logger
): Promise<void> {
  const url = `${COINGECKO_URL}&time=${timeframe}`;
  logger.info(`Navigating to: ${url}`);

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_TIMEOUT,
    });

    // Check for Cloudflare challenge
    const isBlocked = await isCloudflareBlock(page);
    if (isBlocked) {
      logger.warn("Cloudflare challenge detected, waiting...");
      const challengePassed = await waitForCloudflareChallenge(page, logger);
      if (!challengePassed) {
        throw new Error("Failed to bypass Cloudflare challenge");
      }
    }

    // Wait for tables to load
    await page.waitForSelector("table", { timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(POST_NAVIGATION_WAIT);

    const tables = await page.$$("table");
    logger.info(`Found ${tables.length} tables`);

    if (tables.length === 0) {
      await page.screenshot({ path: `debug-${timeframe}.png`, fullPage: true });
      throw new Error("No tables found on page after Cloudflare challenge");
    }

    logger.info(`Page loaded: ${timeframe}`);
  } catch (error) {
    logger.error(`Failed to navigate to ${timeframe}`, error);
    throw error;
  }
}

/* Browser Operations */
async function initializeBrowser(logger: Logger): Promise<Browser> {
  logger.info("Launching browser with anti-detection measures");

  const isHeadless = process.env.HEADLESS !== "false";
  logger.info(`Browser headless mode: ${isHeadless}`);

  const browser = await chromium.launch({
    headless: isHeadless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-web-resources",
      "--disable-sync",
      "--metrics-recording-only",
      "--disable-default-apps",
      "--mute-audio",
    ],
  });

  return browser;
}

async function createPage(browser: Browser, logger: Logger): Promise<Page> {
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  });

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
    });

    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });

    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  });

  logger.info("Page created with anti-detection measures");
  return page;
}

// async function scrapeAllData(page: Page,logger: Logger): Promise<ScrapeResult> {
//   const result: ScrapeResult = {
//     gainers1h: [],
//     losers1h: [],
//     gainers24h: [],
//     losers24h: [],
//     scrapedAt: new Date(),
//   };

//   try {

//     // SCRAPE 24 HOURS 
//     logger.info("Starting 24H scrape");
//     await navigateToTimeframe(page, "h24", logger);

//     logger.info("Scraping 24H Gainers");
//     result.gainers24h = await scrapeSectionData(page, "Top Gainers", logger);

//     logger.info("Scraping 24H Losers");
//     result.losers24h = await scrapeSectionData(page, "Top Losers", logger);

//     // SCRAPE 1 HOUR 
//     logger.info("Starting 1H scrape");
//     await navigateToTimeframe(page, "h1", logger);

//     logger.info("Scraping 1H Gainers");
//     result.gainers1h = await scrapeSectionData(page, "Top Gainers", logger);

//     logger.info("Scraping 1H Losers");
//     result.losers1h = await scrapeSectionData(page, "Top Losers", logger);

//     logger.info(`
// Scrape Summary:
//   Gainers 1H:  ${result.gainers1h.length}
//   Losers 1H:   ${result.losers1h.length}
//   Gainers 24H: ${result.gainers24h.length}
//   Losers 24H:  ${result.losers24h.length}
//   ────────────────────────────
//   Total:       ${
//       result.gainers1h.length +
//       result.losers1h.length +
//       result.gainers24h.length +
//       result.losers24h.length
//     }
// `);

//     return result;
//   } catch (error) {
//     logger.error("Error during scraping", error);
//     throw error;
//   }
// }

// /* Main Scraper Function */
// export async function scrapeCoingecko(): Promise<ScrapeResult> {
//   const logger = new Logger("CoinGeckoScraper");
//   logger.info("Starting CoinGecko scraper with Cloudflare bypass");

//   let browser: Browser | null = null;
//   let page: Page | null = null;

//   try {
//     browser = await initializeBrowser(logger);
//     page = await createPage(browser, logger);

//     const scrapedData = await scrapeAllData(page, logger);

//     logger.info("Scraping completed successfully");
//     return scrapedData;
//   } catch (error: any) {
//     logger.error("Scraping failed", error);
//     throw new Error(`Scraping failed: ${error.message || String(error)}`);
//   } finally {
//     if (page) {
//       try {
//         await page.close();
//         logger.info("Page closed");
//       } catch (err) {
//         logger.error("Failed to close page", err);
//       }
//     }

//     if (browser) {
//       try {
//         await browser.close();
//         logger.info("Browser closed");
//       } catch (err) {
//         logger.error("Failed to close browser", err);
//       }
//     }
//   }
// }


//--- 1 Hour Scrapper --- //
export async function scrapeCoingecko1H() : Promise<ScrapeResult1h>{
  const logger = new Logger("CoinGecko1H");
  logger.info("Starting CoinGecko 1H scraper");

  let browser : Browser | null = null;
  let page : Page | null = null;

  try{
    browser = await initializeBrowser(logger);
    page = await createPage(browser, logger);

    // Navigate to 1H timeframe.
    await navigateToTimeframe(page, "h1", logger);

    // Scrape gainers and losers.
    const gainers = await scrapeSectionData(page, "Top Gainers", logger);
    const losers = await scrapeSectionData(page, "Top Losers", logger);

    const result : ScrapeResult1h = {
      gainers,
      losers,
      timeframe:"1h",
      scrapedAt : new Date(),
    };
    logger.info(`
  1H Scrape Summary:
  Gainers: ${result.gainers.length}
  Losers:  ${result.losers.length}
  ────────────────
  Total:   ${result.gainers.length + result.losers.length}
`);

return result;

  }catch(error : any){
    logger.error("1H Scraping failed", error);
    throw new Error(`!H Scraping failed : ${error.message || String(error)}`);
  }finally{
    if(page){
      try{
        await page.close();
      logger.info("Page closed");
      }catch(err){
      logger.error("Failed to close page", err);
    } 
    }

    if(browser){
      try{
        await browser.close();
        logger.info("Browser closed");
      }catch(err){
        logger.error("Failed to close browser", err);
      }
    }
  }
}



export async function scrapeCoingecko24H(): Promise<ScrapeResult24h> {
  const logger = new Logger("CoinGecko24H");
  logger.info("Starting CoinGecko 24H scraper");

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await initializeBrowser(logger);
    page = await createPage(browser, logger);

    // Navigate to 24H timeframe
    await navigateToTimeframe(page, "h24", logger);

    // Scrape gainers and losers
    const gainers = await scrapeSectionData(page, "Top Gainers", logger);
    const losers = await scrapeSectionData(page, "Top Losers", logger);

    const result: ScrapeResult24h = {
      gainers,
      losers,
      timeframe: "24h",
      scrapedAt: new Date(),
    };

    logger.info(`
24H Scrape Summary:
  Gainers: ${result.gainers.length}
  Losers:  ${result.losers.length}
  ────────────────────────
  Total:   ${result.gainers.length + result.losers.length}
`);

    return result;
  } catch (error: any) {
    logger.error("24H Scraping failed", error);
    throw new Error(`24H Scraping failed: ${error.message || String(error)}`);
  } finally {
    if (page) {
      try {
        await page.close();
        logger.info("Page closed");
      } catch (err) {
        logger.error("Failed to close page", err);
      }
    }

    if (browser) {
      try {
        await browser.close();
        logger.info("Browser closed");
      } catch (err) {
        logger.error("Failed to close browser", err);
      }
    }
  }
}


export default {
  scrapeCoingecko1H,
  scrapeCoingecko24H,
};

// export default scrapeCoingecko;