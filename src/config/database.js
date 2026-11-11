import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();
const { Pool } = pkg;

export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
  `);
}
