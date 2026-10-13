/**
 * @file report.controller.js
 * @description Controlador para gestionar los reportes territoriales y la persistencia en PostgreSQL.
 */
import { dbPool } from '../config/database.js';

export class ReportController {
  constructor(nlpService) {
    this.nlpService = nlpService;
    
    // Inicializar tabla de reportes si no existe
    this.initTable();
  }

  async initTable() {
    try {
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id SERIAL PRIMARY KEY,
          description TEXT NOT NULL,
          latitude NUMERIC(10, 6) NOT NULL,
          longitude NUMERIC(10, 6) NOT NULL,
          category VARCHAR(100),
          severity VARCHAR(20),
          keywords TEXT[],
          is_actionable BOOLEAN,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("[Database] Tabla 'reports' verificada o creada con éxito.");
    } catch (err) {
      console.error("[Database] Error creando la tabla reports:", err);
    }
  }

  createReport = async (req, res) => {
    try {
      const { description, latitude, longitude } = req.body;
      if (!description) {
        return res.status(400).json({ success: false, error: "La descripción es requerida" });
      }

      // Analizar con NLP (Gemini o Respaldo)
      const analysis = await this.nlpService.classifyReport(description);

      // Guardar en PostgreSQL
      const query = `
        INSERT INTO reports (description, latitude, longitude, category, severity, keywords, is_actionable)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `;
      const values = [
        description,
        latitude || 1.204265,
        longitude || -77.295042,
        analysis.category,
        analysis.severity,
        analysis.extractedKeywords,
        analysis.isActionable
      ];

      const result = await dbPool.query(query, values);
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error("[ReportController] Error al crear reporte:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getReports = async (req, res) => {
    try {
      const result = await dbPool.query('SELECT * FROM reports ORDER BY created_at DESC;');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error("[ReportController] Error al obtener reportes:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
}