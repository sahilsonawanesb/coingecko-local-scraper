-- Create scraper user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'scraper_user') THEN
      CREATE ROLE scraper_user WITH LOGIN PASSWORD 'Sahil@6222';
   END IF;
END
$do$;

-- Create database if not exists
SELECT 'CREATE DATABASE coingecko_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'coingecko_db')\gexec

-- Connect to the database
\c coingecko_db

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE coingecko_db TO scraper_user;

-- Create tables
CREATE TABLE IF NOT EXISTS gainers_1h (
  id SERIAL PRIMARY KEY,
  rank INTEGER NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  price_usd NUMERIC NOT NULL,
  volume_usd NUMERIC,
  change_pct NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS losers_1h (
  id SERIAL PRIMARY KEY,
  rank INTEGER NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  price_usd NUMERIC NOT NULL,
  volume_usd NUMERIC,
  change_pct NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gainers_24h (
  id SERIAL PRIMARY KEY,
  rank INTEGER NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  price_usd NUMERIC NOT NULL,
  volume_usd NUMERIC,
  change_pct NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS losers_24h (
  id SERIAL PRIMARY KEY,
  rank INTEGER NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  price_usd NUMERIC NOT NULL,
  volume_usd NUMERIC,
  change_pct NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Grant all permissions on tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO scraper_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO scraper_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO scraper_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO scraper_user;
