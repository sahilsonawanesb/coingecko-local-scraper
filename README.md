#### Coingecko Local Scraper - Top Gainers & Losers
### **Section 1: Title and Description**

```
# CoinGecko Local Scraper

A production-ready Node.js application that automatically scrapes Top Gainers & Losers cryptocurrency data from CoinGecko and stores it in PostgreSQL. Runs on a schedule using cron jobs with Cloudflare bypass capability.

## Overview

This scraper fetches real-time cryptocurrency gainers and losers data at configurable intervals:
- **1-Hour Data**: Top 30 gainers and losers in the last hour
- **24-Hour Data**: Top 30 gainers and losers in the last 24 hours

Data is automatically inserted into PostgreSQL using upsert queries to prevent duplicates.
```

---

### **Section 2: Features**

Type this:
```
## Features

✅ **Cloudflare Bypass** - Uses Playwright with anti-detection measures
✅ **Scheduled Execution** - Cron-based job scheduling (configurable intervals)
✅ **Duplicate Prevention** - UPSERT queries to handle duplicate data
✅ **Error Handling** - Comprehensive error classification and logging
✅ **Auto Table Creation** - SQL scripts create tables if they don't exist
✅ **Docker Ready** - Complete Docker and Docker Compose setup
✅ **Production Grade** - Environment separation, logging, monitoring
✅ **Health Checks** - API endpoints for health and status monitoring
✅ **Modular Architecture** - Separated concerns (services, jobs, routes, config)
✅ **TypeScript** - Full type safety throughout codebase
```

---

### **Section 3: Architecture**

Type this:
```
## Architecture

### System Design

\`\`\`
┌──────────────────────────────────────────────┐
│         CoinGecko Local Scraper              │
├──────────────────────────────────────────────┤
│                                              │
│  Node.js Application (TypeScript)            │
│  ├── Cron Scheduler                          │
│  │   ├── 1H Job (every hour)                 │
│  │   └── 24H Job (every day)                 │
│  ├── Playwright Scraper                      │
│  │   ├── Cloudflare Bypass                   │
│  │   └── Data Extraction                     │
│  ├── Database Service                        │
│  │   ├── PostgreSQL Connection               │
│  │   └── UPSERT Operations                   │
│  ├── Logger Service                          │
│  │   └── Structured Logging                  │
│  └── Express API                             │
│      ├── Health Checks                       │
│      ├── Manual Triggers                     │
│      └── Log Viewing                         │
│                                              │
│  Database Layer                              │
│  ├── gainers_1h                              │
│  ├── losers_1h                               │
│  ├── gainers_24h                             │
│  └── losers_24h                              │
│                                              │
│  PostgreSQL Instance                         │
│  └── Persistent Data Storage                 │
│                                              │
└──────────────────────────────────────────────┘
\`\`\`

### Data Flow

\`\`\`
Cron Job Triggers
    ↓
Playwright Scraper
    ↓ (fetches data from CoinGecko)
Parse & Validate Data
    ↓
Database Service
    ↓ (UPSERT into tables)
PostgreSQL Database
    ↓
Data Available for Analysis
\`\`\`
```

---

### **Section 4: Prerequisites**

Type this:
```
## Prerequisites

### Local Development

- Node.js 18.x or higher
- npm 8.x or higher
- PostgreSQL 13.x or higher
- Git



### System Requirements

- Linux (Ubuntu 20.04 LTS or higher) recommended
- macOS 11 or higher
- Windows 10/11 with WSL2
```

---

### **Section 5: Installation**

Type this:
```
## Installation

### Step 1: Clone Repository

\`\`\`bash
git clone https://github.com/sahilsonawanesb/coingecko-local-scraper.git
cd coingecko-local-scraper
\`\`\`

### Step 2: Install Dependencies

\`\`\`bash
npm install
\`\`\`

### Step 3: Setup Environment Variables

\`\`\`bash
cp .env.example .env
nano .env  # Edit with your PostgreSQL credentials
\`\`\`

### Step 4: Configure Database

Create PostgreSQL database and user:

\`\`\`bash
psql -U postgres

CREATE DATABASE coingecko_db;
CREATE USER scraper_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE coingecko_db TO scraper_user;
\`\`\`

### Step 5: Initialize Tables

Tables are created automatically when app starts, but you can initialize manually:

\`\`\`bash
psql -U scraper_user -d coingecko_db -f init-scripts/upsert-setup.sql
\`\`\`
```

---

### **Section 6: Configuration**

Type this:
```
## Configuration

### Environment Variables

Create \`.env\` file in project root:

\`\`\`env
# Node.js
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# PostgreSQL
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=scraper_user
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=coingecko_db

# Scraper
SCRAPER_TIMEOUT_MS=180000
HEADLESS=true
\`\`\`

### Database Credentials

Update these with your PostgreSQL:
- **HOST**: PostgreSQL server address
- **PORT**: PostgreSQL port (default: 5432)
- **USER**: Database user
- **PASSWORD**: User password
- **NAME**: Database name

### Cron Schedules

Located in \`src/index.ts\`:

- **1H Job**: \`0 * * * *\` (every hour at minute 0)
- **24H Job**: \`0 0 * * *\` (every day at midnight)

Modify these patterns to change schedule.
```

---

### **Section 7: Usage**

Type this:
```
## Usage

### Local Development

\`\`\`bash
npm run dev
\`\`\`

This starts the app in development mode with auto-reload.

### Production Build

\`\`\`bash
npm run build
npm start
\`\`\`

### Docker

\`\`\`bash
# Build and start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f scraper

# Stop containers
docker-compose down
\`\`\`

### Manual Triggers (Testing)

Trigger 1H job:
\`\`\`bash
curl -X POST http://localhost:3000/api/trigger-1h
\`\`\`

Trigger 24H job:
\`\`\`bash
curl -X POST http://localhost:3000/api/trigger-24h
\`\`\`

View logs:
\`\`\`bash
curl http://localhost:3000/api/logs?limit=200
\`\`\`
```

---

### **Section 8: API Endpoints**

Type this:
```
## API Endpoints

### Health Check

\`\`\`
GET /api/health
\`\`\`

Response:
\`\`\`json
{
  "status": "ok",
  "timestamp": "2026-01-20T10:00:00Z",
  "uptime": 3600,
  "logCount": 150
}
\`\`\`

### Status

\`\`\`
GET /api/status
\`\`\`

Response:
\`\`\`json
{
  "status": "running",
  "timestamp": "2026-01-20T10:00:00Z",
  "environment": "production",
  "database": "connected"
}
\`\`\`

### Logs

\`\`\`
GET /api/logs?limit=100
\`\`\`

Returns recent log entries.

### Manual Triggers

\`\`\`
POST /api/trigger-1h
POST /api/trigger-24h
\`\`\`

Manually trigger scraper jobs (for testing).
```

---

### **Section 9: Database Schema**

Type this:
```
## Database Schema

### Tables

All tables follow this structure:

\`\`\`sql
id              SERIAL PRIMARY KEY
rank            INTEGER NOT NULL
name            TEXT NOT NULL
symbol          TEXT UNIQUE NOT NULL
price_usd       NUMERIC NOT NULL
volume_usd      NUMERIC
change_pct      NUMERIC NOT NULL
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
\`\`\`

### Table Names

- \`gainers_1h\` - Top 30 gainers (1 hour)
- \`losers_1h\` - Top 30 losers (1 hour)
- \`gainers_24h\` - Top 30 gainers (24 hours)
- \`losers_24h\` - Top 30 losers (24 hours)

### Data Example

\`\`\`
id | rank | name       | symbol | price_usd | change_pct | created_at
1  | 1    | Bitcoin    | BTC    | 45000.50  | 5.23       | 2026-01-20 10:00:00
2  | 2    | Ethereum   | ETH    | 2500.25   | 3.15       | 2026-01-20 10:00:00
\`\`\`
```

---

### **Section 10: File Structure**

Type this:
```
## File Structure

\`\`\`
coingecko-local-scraper/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── config/
│   │   └── environment.ts       # Configuration loader
│   ├── jobs/
│   │   ├── workflow-1h.ts            # 1-hour cron job
│   │   └── workflow-24h.ts           # 24-hour cron job
|   |__  services/
│   │   ├── loggerService.ts     # Logging utility
│   │   ├── databaseService.ts   # Database operations
│   │   └── scraperService.ts    # Scraper wrapper
│   ├
│   ├── routes/
│   │   └── health.routes.ts     # API endpoints
│   └── modules/
│       └── scraperService.ts    # Playwright scraper
├── init-scripts/
│   └── upsert-setup.sql         # Database initialization
├── Dockerfile                    # Docker build instructions
├── docker-compose.yml           # Docker Compose config
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── .env.example                 # Environment template
└── README.md                    # This file
\`\`\`
```

---

### **Section 11: Deployment**

Type this:
```
## Deployment

### Deployment to VM

**Prerequisites:**
- SSH access to VM
- Docker installed on VM
- PostgreSQL credentials

**Steps:**

1. **SSH into VM**
   \`\`\`bash
   ssh -i ~/.ssh/hetzner-key.pem root@77.42.81.198
   \`\`\`

2. **Clone Repository**
   \`\`\`bash
   cd ~
   git clone https://github.com/sahilsonawanesb/coingecko-local-scraper.git
   cd coingecko-local-scraper
   \`\`\`

3. **Create Production .env**
   \`\`\`bash
   nano .env
   \`\`\`
   
   Add production PostgreSQL credentials

4. **Build and Start Docker**
   \`\`\`bash
   docker-compose up -d
   \`\`\`

5. **Verify Deployment**
   \`\`\`bash
   docker-compose ps
   curl http://localhost:3000/api/health
   \`\`\`

### Docker Compose

\`\`\`yaml
# docker-compose.yml handles:
- Building Docker image
- Running scraper container
- Port mapping (3000:3000)
- Environment variables
- Auto-restart on failure
\`\`\`



---

### **Section 12: Monitoring & Logs**

Type this:
```
## Monitoring & Logs

### Viewing Logs

**Development:**
\`\`\`bash
npm run dev
# Logs print to console in real-time
\`\`\`

**Docker:**
\`\`\`bash
docker-compose logs -f scraper
# Follow logs from scraper container
\`\`\`

**Via API:**
\`\`\`bash
curl http://localhost:3000/api/logs?limit=500
# Returns last 500 log entries as JSON
\`\`\`

### Log Levels

- **DEBUG**: Detailed diagnostic info
- **INFO**: Normal operation messages
- **WARN**: Warning messages
- **ERROR**: Error messages

### Monitoring Endpoints

- \`/api/health\` - Quick health check
- \`/api/status\` - Detailed status
- \`/api/logs\` - Recent logs
- \`/api/trigger-1h\` - Manual trigger

### Database Monitoring

Check recent insertions:
\`\`\`bash
psql -U scraper_user -d coingecko_db -c "SELECT COUNT(*) FROM gainers_1h;"
SELECT name, price_usd, created_at FROM gainers_1h ORDER BY created_at DESC LIMIT 10;
\`\`\`
```

---

### **Section 13: Troubleshooting**

Type this:
```
## Troubleshooting

### Issue: Database Connection Refused

**Error Message:**
\`\`\`
Failed to connect to PostgreSQL
\`\`\`

**Solutions:**
1. Verify PostgreSQL is running
2. Check DATABASE_HOST in .env
3. Verify DATABASE_USER and DATABASE_PASSWORD
4. Check port 5432 is open
5. Ensure VM can reach PostgreSQL server

### Issue: Cloudflare Challenge

**Error Message:**
\`\`\`
Failed to bypass Cloudflare challengem on VM
\`\`\`

**Solutions:**
1. May be temporary - scraper retries automatically
2. Increase SCRAPER_TIMEOUT_MS in .env
3. Check internet connectivity
4. Verify Playwright browser installed

### Issue: Duplicate Data in Database

**Cause:** Using INSERT instead of UPSERT

**Solution:**
- Ensure using UPSERT query with \`ON CONFLICT\`
- Check databaseService.ts has correct SQL

### Issue: Cron Jobs Not Running

**Error:**
\`\`\`
Jobs scheduled but not executing
\`\`\`

**Debug:**
1. Check logs for cron execution: \`GET /api/logs\`
2. Verify NODE_ENV is set correctly
3. Check system clock is accurate
4. Restart container: \`docker-compose restart scraper\`

### Issue: High Memory Usage

**Solutions:**
1. Reduce LOG_LEVEL to "info"
2. Clear old logs: \`POST /api/logs/clear\`
3. Monitor with: \`docker stats\`



---

### **Section 14: Contributing**

Type this:
```
## Contributing

### Development Setup

1. Fork the repository
2. Clone your fork
3. Create a feature branch: \`git checkout -b feature/your-feature\`
4. Make changes and test locally
5. Commit with clear messages
6. Push to your fork
7. Create Pull Request

### Code Standards

- Use TypeScript for all new code
- Follow existing code style
- Add comments for complex logic
- Test changes locally before pushing
- Update README if adding features

### Testing Checklist

Before submitting PR:
- [ ] Code compiles without errors
- [ ] Scraper test passes locally
- [ ] Database insertions work
- [ ] API endpoints respond
- [ ] Logs show no errors
- [ ] Docker build succeeds
```

---

