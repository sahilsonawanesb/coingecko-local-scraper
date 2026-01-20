import { Router, Request, Response } from "express";
import { logger } from "../services/loggerService.js";
import { run1HourJob } from "../jobs/workflow-1h.js";
import { run24HourJob } from "../jobs/workflow-24.js";

const router = Router();

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  logCount: number;
}

interface AppStatus {
  status: string;
  timestamp: string;
  environment: string;
  database: string;
}

// GET /health - Simple health check
router.get("/health", (req: Request, res: Response) => {
  const uptime = process.uptime();
  const logs = logger.getLogs(0);

  const response: HealthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    logCount: logs.length,
  };

  res.status(200).json(response);
});

// GET /status - Detailed status
router.get("/status", (req: Request, res: Response) => {
  const response: AppStatus = {
    status: "running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: "connected",
  };

  res.status(200).json(response);
});



// GET /logs - Get recent logs
router.get("/logs", (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const logs = logger.getLogs(limit);

  res.status(200).json({
    count: logs.length,
    logs,
  });
});

// GET / - Root endpoint
router.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "CoinGecko Local Scraper API",
    version: "1.0.0",
    endpoints: {
      health: "GET /api/health",
      status: "GET /api/status",
      logs: "GET /api/logs?limit=100",
    },
  });
});


// Post Route /- API endpoint.
router.post("/trigger-1h", (req : Request, res : Response) => {
  try{
    logger.info("API", "Manual Trigger for 1H job");

    // Trigger the job (it runs in background)
    run1HourJob().catch((error) => {
      logger.error("API", "1H job execution error", error);
    });

    // Return immediately (don't wait for job to complete)
    res.status(200).json({
      message: "1H job triggered",
      status: "running",
      timestamp: new Date().toISOString(),
    });
  }catch(error : any){
    logger.error("API", "Failed to trigger 1H job", error);
    res.status(500).json({
      message: "Failed to trigger 1H job",
      error: error.message,
    });
  }
});

// Post Route /- API endpoint.
router.post("/trigger-24h", (req : Request, res : Response) => {
  try{

    logger.info("API", "Manual Trigger for 24h job");

    // Trigger the 24h jobs (it runs in background)
    run24HourJob().catch((error) => {
      logger.error("API", "24H job execution error", error);
    });

    // Return immediately don't wait for job to complete.
    res.status(200).json({
      message : '24H Job Triggered',
      status : "running",
      timestamp : new Date().toISOString()
    });

  }catch(error : any){
    logger.error("API", "Failed to trigger 24H job", error);
    res.status(500).json({
      message : "Failed to trigger 24h job",
      error : error.message
    });
  }
});

export default router;