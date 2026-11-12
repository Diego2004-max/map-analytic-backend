import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10_000,
  query_timeout: 30_000,
  statement_timeout: 30_000
});

export async function initializeDatabase() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS anomaly_reports (
      id SERIAL PRIMARY KEY,
      description TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
      longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
      citizen_id VARCHAR(100) DEFAULT 'ANONYMOUS',
      category VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
      keywords TEXT[] NOT NULL DEFAULT '{}',
      is_actionable BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_anomaly_reports_created_at ON anomaly_reports (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_anomaly_reports_coordinates ON anomaly_reports (latitude, longitude);
    CREATE TABLE IF NOT EXISTS report_attachments (
      id SERIAL PRIMARY KEY,
      report_id INTEGER NOT NULL REFERENCES anomaly_reports(id) ON DELETE CASCADE,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      byte_size INTEGER NOT NULL CHECK (byte_size > 0),
      content BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_report_attachments_report_id ON report_attachments (report_id);
    CREATE TABLE IF NOT EXISTS app_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(320) NOT NULL,
      display_name VARCHAR(120) NOT NULL,
      password_hash TEXT,
      google_subject VARCHAR(255) UNIQUE,
      role VARCHAR(20) NOT NULL DEFAULT 'ANALYST' CHECK (role IN ('ANALYST', 'ADMIN')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email_lower ON app_users (LOWER(email));
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'ANALYST';
    ALTER TABLE anomaly_reports ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES app_users(id);
  `);
}
