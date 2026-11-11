import { dbPool } from '../config/database.js';

export class ReportController {
  constructor(nlpClassificationService) { this.nlpService = nlpClassificationService; }
  createReport = async (req, res) => {
    try {
      const { description, latitude, longitude, citizenId } = req.body;
      const lat = Number(latitude); const lng = Number(longitude);
      if (typeof description !== 'string' || description.trim().length < 10) return res.status(400).json({ error: 'Description must contain at least 10 characters.' });
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return res.status(400).json({ error: 'Coordinates must be valid latitude and longitude values.' });
      const classification = await this.nlpService.classifyReport(description.trim());
      const { rows } = await dbPool.query(`INSERT INTO anomaly_reports (description, latitude, longitude, citizen_id, category, severity, keywords, is_actionable, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING') RETURNING id, description, category, severity, status, keywords, is_actionable, latitude, longitude, created_at;`, [description.trim(), lat, lng, citizenId || 'ANONYMOUS', classification.category, classification.severity, classification.extractedKeywords, classification.isActionable]);
      return res.status(201).json({ message: 'Anomaly reported and stored successfully.', data: rows[0] });
    } catch (error) { console.error('[ReportController] Error creating report:', error); return res.status(500).json({ error: 'Internal server error during report processing.' }); }
  };
  getReports = async (_req, res) => {
    try { const { rows } = await dbPool.query('SELECT id, description, category, severity, status, keywords, is_actionable, latitude, longitude, created_at FROM anomaly_reports ORDER BY created_at DESC LIMIT 100;'); return res.status(200).json({ data: rows }); }
    catch (error) { console.error('[ReportController] Error fetching reports:', error); return res.status(500).json({ error: 'Failed to retrieve reports.' }); }
  };
}
