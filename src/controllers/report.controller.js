import { dbPool } from '../config/database.js';
import { providerStatus } from '../services/audio-transcription.service.js';

export class ReportController {
  constructor(nlpClassificationService, audioTranscriptionService) { this.nlpService = nlpClassificationService; this.audioService = audioTranscriptionService; }
  createReport = async (req, res) => {
    try {
      const { description, latitude, longitude, citizenId } = req.body;
      const lat = Number(latitude); const lng = Number(longitude);
      const audioFiles = (req.files || []).filter((file) => file.mimetype.startsWith('audio/'));
      if (audioFiles.length > 1) return res.status(400).json({ error: 'Only one audio recording is allowed per report.' });
      if ((typeof description !== 'string' || description.trim().length < 10) && !audioFiles.length) return res.status(400).json({ error: 'Provide a description of at least 10 characters or an audio recording.' });
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return res.status(400).json({ error: 'Coordinates must be valid latitude and longitude values.' });
      let transcript = '';
      if (audioFiles.length) {
        try { transcript = await this.audioService.transcribe(audioFiles[0]); }
        catch (error) {
          const status = providerStatus(error);
          console.error('[ReportController] Audio transcription failed:', { status, message: error.message });
          if (status === 402) return res.status(503).json({ code: 'AUDIO_CREDITS_EXHAUSTED', error: 'La transcripción está suspendida porque el servicio agotó sus créditos. El administrador debe revisar la facturación de Gemini. Tu reporte no se ha guardado.' });
          if (!this.audioService.client || [400, 401, 403, 404].includes(status)) return res.status(503).json({ error: 'El servicio de audio necesita revisar su clave o modelo de Gemini en Render.' });
          if (status === 429) return res.status(503).json({ error: 'Gemini alcanzó su cuota de audio. Inténtalo más tarde.' });
          return res.status(503).json({ error: 'Gemini no respondió a la transcripción. Inténtalo de nuevo en unos minutos.' });
        }
        if (!transcript) return res.status(422).json({ error: 'No se encontró voz comprensible en el audio.' });
      }
      const reportDescription = [description?.trim(), transcript && `Transcripción del audio: ${transcript}`].filter(Boolean).join('\n\n');
      if (reportDescription.length < 10) return res.status(422).json({ error: 'The report content is too short.' });
      if (reportDescription.length > 5000) return res.status(413).json({ error: 'Report content must be 5000 characters or fewer.' });
      const classification = await this.nlpService.classifyReport(reportDescription);
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(`INSERT INTO anomaly_reports (description, latitude, longitude, citizen_id, category, severity, keywords, is_actionable, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING') RETURNING id, description, category, severity, status, keywords, is_actionable, latitude, longitude, created_at;`, [reportDescription, lat, lng, citizenId || 'ANONYMOUS', classification.category, classification.severity, classification.extractedKeywords, classification.isActionable]);
        const report = rows[0];
        const attachments = [];
        for (const file of req.files || []) {
          const saved = await client.query(`INSERT INTO report_attachments (report_id, original_name, mime_type, byte_size, content) VALUES ($1,$2,$3,$4,$5) RETURNING id, original_name, mime_type, byte_size;`, [report.id, file.originalname, file.mimetype, file.size, file.buffer]);
          attachments.push({ ...saved.rows[0], url: `/api/v1/reports/${report.id}/attachments/${saved.rows[0].id}` });
        }
        await client.query('COMMIT');
        return res.status(201).json({ message: 'Anomaly reported and stored successfully.', data: { ...report, attachments } });
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    } catch (error) { console.error('[ReportController] Error creating report:', error); return res.status(500).json({ error: 'Internal server error during report processing.' }); }
  };
  getReports = async (req, res) => {
    try {
      const requestedLimit = Number.parseInt(req.query.limit, 10);
      const requestedOffset = Number.parseInt(req.query.offset, 10);
      const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 100;
      const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
      const { rows } = await dbPool.query(`SELECT r.id, r.description, r.category, r.severity, r.status, r.keywords, r.is_actionable, r.latitude, r.longitude, r.created_at,
        COALESCE((SELECT json_agg(json_build_object('id', a.id, 'original_name', a.original_name, 'mime_type', a.mime_type, 'byte_size', a.byte_size, 'url', '/api/v1/reports/' || r.id || '/attachments/' || a.id) ORDER BY a.id) FROM report_attachments a WHERE a.report_id = r.id), '[]'::json) AS attachments
        FROM anomaly_reports r ORDER BY r.created_at DESC LIMIT $1 OFFSET $2;`, [limit, offset]);
      return res.status(200).json({ data: rows, pagination: { limit, offset, returned: rows.length, hasMore: rows.length === limit } });
    }
    catch (error) { console.error('[ReportController] Error fetching reports:', error); return res.status(500).json({ error: 'Failed to retrieve reports.' }); }
  };
  getAttachment = async (req, res) => {
    try {
      const { rows } = await dbPool.query('SELECT original_name, mime_type, content FROM report_attachments WHERE id = $1 AND report_id = $2', [req.params.attachmentId, req.params.reportId]);
      if (!rows[0]) return res.status(404).json({ error: 'Attachment not found.' });
      res.type(rows[0].mime_type).set('Cache-Control', 'private, max-age=3600').set('X-Content-Type-Options', 'nosniff').set('Content-Disposition', `inline; filename="${rows[0].original_name.replace(/["\\]/g, '')}"`).send(rows[0].content);
    } catch (error) { console.error('[ReportController] Error retrieving attachment:', error); return res.status(500).json({ error: 'Failed to retrieve attachment.' }); }
  };
}
