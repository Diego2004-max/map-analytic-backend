import { dbPool } from '../config/database.js';

export class ReportController {
  constructor(nlpService) {
    this.nlpService = nlpService;
    this.initTable();
  }

  async initTable() {
    try {
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) DEFAULT 'Anomalía Territorial',
          description TEXT NOT NULL,
          latitude NUMERIC(10, 6) NOT NULL,
          longitude NUMERIC(10, 6) NOT NULL,
          category VARCHAR(100),
          severity VARCHAR(20),
          keywords TEXT[],
          is_actionable BOOLEAN,
          author VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("[Database] Tabla 'reports' verificada con éxito.");
    } catch (err) {
      console.error("[Database] Error creando la tabla reports:", err);
    }
  }

  createReport = async (req, res) => {
    try {
      const { title, description, latitude, longitude, author } = req.body;
      if (!description) {
        return res.status(400).json({ success: false, error: "La descripción es requerida" });
      }

      // Análisis con NLP seguro (con respaldo en caso de fallo de IA)
      let analysis = {
        category: 'Sismo / Geológico',
        severity: 'Media',
        extractedKeywords: ['territorio', 'anomalía'],
        isActionable: true
      };

      try {
        if (this.nlpService && typeof this.nlpService.classifyReport === 'function') {
          const result = await this.nlpService.classifyReport(description);
          if (result) analysis = { ...analysis, ...result };
        }
      } catch (nlpError) {
        console.warn("[NLP Service Warning] Usando clasificación de respaldo:", nlpError.message);
      }

      // Guardar en PostgreSQL de manera segura
      const query = `
        INSERT INTO reports (title, description, latitude, longitude, category, severity, keywords, is_actionable, author)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `;
      const values = [
        title || description.substring(0, 40) + '...',
        description,
        latitude || 1.204265,
        longitude || -77.295042,
        analysis.category || 'General',
        analysis.severity || 'Media',
        analysis.extractedKeywords || [],
        analysis.isActionable !== undefined ? analysis.isActionable : true,
        author || 'Anónimo'
      ];

      const result = await dbPool.query(query, values);
      res.status(201).json({ success: true, reports: result.rows[0], data: result.rows[0] });
    } catch (error) {
      console.error("[ReportController] Error crítico al crear reporte:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  getReports = async (req, res) => {
    try {
      const result = await dbPool.query('SELECT * FROM reports ORDER BY created_at DESC;');
      res.json({ success: true, reports: result.rows });
    } catch (error) {
      console.error("[ReportController] Error al obtener reportes:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
}