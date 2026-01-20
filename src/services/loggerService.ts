type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = "INFO") {
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  private log(level: LogLevel, context: string, message: string, data?: any) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    const prefix = `[${entry.timestamp}] [${level}] [${context}]`;
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";

    if (level === "ERROR") {
      console.error(`${prefix} ${message}${dataStr}`);
    } else if (level === "WARN") {
      console.warn(`${prefix} ${message}${dataStr}`);
    } else {
      console.log(`${prefix} ${message}${dataStr}`);
    }
  }

  info(context: string, message: string, data?: any) {
    this.log("INFO", context, message, data);
  }

  error(context: string, message: string, data?: any) {
    this.log("ERROR", context, message, data);
  }

  warn(context: string, message: string, data?: any) {
    this.log("WARN", context, message, data);
  }

  debug(context: string, message: string, data?: any) {
    this.log("DEBUG", context, message, data);
  }

  getLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  clearLogs() {
    this.logs = [];
  }
}

// Export singleton instance
export const logger = new LoggerService("INFO");
export default logger;