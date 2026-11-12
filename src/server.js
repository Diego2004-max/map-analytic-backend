import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import crypto from 'node:crypto';
import { ReportRetentionService } from './services/report-retention.service.js';
import { createCorsOptions } from './config/cors.js';
import { dbPool, initializeDatabase } from './config/database.js';
import { AuthController } from './controllers/auth.controller.js';
import { ReportController } from './controllers/report.controller.js';
import { createReportRouter } from './routes/report.routes.js';
import { AnomalyMonitorService } from './services/anomaly-monitor.service.js';
import { AudioTranscriptionService } from './services/audio-transcription.service.js';
import { NLPClassificationService } from './services/nlp-classification.service.js';
import { requireSession } from './middleware/session.js';
dotenv.config();
const app = express(); const port = Number(process.env.PORT || 5000);
let databaseReady = false;
let databaseInitializing = false;
const retention = new ReportRetentionService(dbPool);
const cleanupReports = () => retention.run().catch(() => console.error('[Retention] Database cleanup failed'));
const authAttempts = new Map();
const authGuard = (req, res, next) => {
  const key = req.ip || 'unknown'; const now = Date.now(); const entry = authAttempts.get(key) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000; }
  entry.count += 1; authAttempts.set(key, entry);
  if (entry.count > 20) return res.status(429).json({ error: 'Too many authentication attempts. Try again later.' });
  next();
};
app.use((req, res, next) => { const requestId = req.get('x-request-id') || crypto.randomUUID(); res.set('x-request-id', requestId); res.set('x-content-type-options', 'nosniff'); res.set('x-frame-options', 'DENY'); next(); });
app.use(cors(createCorsOptions(process.env.FRONTEND_ORIGIN))); app.use(express.json({ limit: '32kb' }));
const reportController = new ReportController(new NLPClassificationService(), new AudioTranscriptionService());
const authController = new AuthController({ googleClientId: process.env.GOOGLE_CLIENT_ID, jwtSecret: process.env.JWT_SECRET }); const monitorService = new AnomalyMonitorService();
app.use('/api/v1', createReportRouter(reportController)); app.use('/api', createReportRouter(reportController));
app.post('/api/v1/auth/google', authGuard, authController.verifyGoogleCredential);
app.post('/api/v1/auth/register', authGuard, authController.register);
app.post('/api/v1/auth/login', authGuard, authController.login);
app.get('/api/v1/auth/me', requireSession, authController.currentUser);
app.get('/api/health', async (_req, res) => {
  if (!databaseReady) return res.status(503).json({ status: 'database_unavailable' });
  const startedAt = performance.now();
  try { await dbPool.query('SELECT 1'); return res.json({ status: 'ok', database: 'ready', latencyMs: Math.round(performance.now() - startedAt), uptimeSeconds: Math.floor(process.uptime()), retention: retention.lastRun, timestamp: new Date().toISOString() }); }
  catch (error) { databaseReady = false; console.error('[Database health]', error.message); return res.status(503).json({ status: 'database_unavailable' }); }
});
const scan = async (_req, res, next) => { try { res.json({ success: true, data: await monitorService.scanTerritorialAnomalies() }); } catch (error) { next(error); } };
app.get('/api/v1/monitor/scan', scan); app.get('/api/monitor/scan', scan);
app.use((error, _req, res, _next) => {
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Each attachment must be 8 MB or smaller.' });
  if (error.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'A report can include up to four attachments.' });
  if (error.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'Attachment field is not valid.' });
  console.error('[API]', error); return res.status(500).json({ error: 'Unexpected server error.' });
});
async function initializeWhenAvailable() {
  if (databaseReady || databaseInitializing) return;
  databaseInitializing = true;
  try { await initializeDatabase(); databaseReady = true; console.log('[Database] Ready'); await cleanupReports(); }
  catch (error) { console.error('[Database] Initialization failed:', error.message); }
  finally { databaseInitializing = false; }
}
app.listen(port, '0.0.0.0', () => {
  console.log(`[MapAnalytic Server] Running on port ${port}`);
  initializeWhenAvailable();
  setInterval(initializeWhenAvailable, 30_000);
  setInterval(() => { if (databaseReady) cleanupReports(); }, 60_000).unref();
});
export default app;
