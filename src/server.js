import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dbPool } from './config/database.js';
import { ReportController } from './controllers/report.controller.js';
import { NLPClassificationService } from './services/nlp-classification.service.js';
import { AnomalyMonitorService } from './services/anomaly-monitor.service.js';

dotenv.config();

const app = express();
// Producción: Render asigna automáticamente process.env.PORT, si no, usa el 5000
const PORT = process.env.PORT || 5000;

// Configuración avanzada de CORS para producción
app.use(cors({
  origin: '*', // Puedes cambiarlo luego por la URL exacta de tu frontend en Vercel
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

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