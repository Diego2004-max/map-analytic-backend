/**
 * @file server.js
 * @description Archivo principal del servidor Backend con Express y PostgreSQL.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dbPool } from './config/database.js';
import { ReportController } from './controllers/report.controller.js';
import { NLPClassificationService } from './services/nlp-classification.service.js';
import { AnomalyMonitorService } from './services/anomaly-monitor.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Instanciar servicios
const nlpService = new NLPClassificationService();
const reportController = new ReportController(nlpService);
const anomalyMonitorService = new AnomalyMonitorService();

// Rutas de la API
app.post('/api/reports', reportController.createReport);
app.get('/api/reports', reportController.getReports);

app.get('/api/monitor/scan', async (req, res) => {
  try {
    const anomalies = await anomalyMonitorService.scanTerritorialAnomalies();
    res.json({ success: true, count: anomalies.length, anomalies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Conectar base de datos y arrancar servidor
dbPool.query('SELECT NOW()')
  .then(() => {
    console.log('[Database] Connected successfully to PostgreSQL');
    app.listen(PORT, () => {
      console.log(`[MapAnalytic Server] Running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('[Database] Connection error:', err);
  });