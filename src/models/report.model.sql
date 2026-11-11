/**
 * @file report.model.sql
 * @description Standard relational database schema for territorial anomaly reports.
 */

-- Create the main table for anomalies with real coordinates
CREATE TABLE IF NOT EXISTS anomaly_reports (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    citizen_id VARCHAR(100) DEFAULT 'ANONYMOUS',
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    keywords TEXT[],
    is_actionable BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_anomaly_reports_coords ON anomaly_reports (latitude, longitude);