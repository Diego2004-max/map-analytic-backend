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
          title VARCHAR(255) NOT NULL,
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
      console.log("[Database] Tabla 'reports' verificada o creada con éxito.");
    } catch (err) {
      console.error("[Database] Error creando la tabla reports:", err);
    }
  }

  createReport = async (req, res) => {
    try {
      const { title, description, latitude, longitude, author } = req.body;
      if (!description || !title) {
        return res.status(400).json({ success: false, error: "El título y la descripción son requeridos" });
      }

      // Analizar con NLP (Gemini o Respaldo)
      const analysis = await this.nlpService.classifyReport(description);

      // Guardar en PostgreSQL
      const query = `
        INSERT INTO reports (title, description, latitude, longitude, category, severity, keywords, is_actionable, author)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `;
      const values = [
        title,
        description,
        latitude || 1.204265,
        longitude || -77.295042,
        analysis.category,
        analysis.severity,
        analysis.extractedKeywords,
        analysis.isActionable,
        author || 'Anónimo'
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
      // Mapeamos 'data' como 'reports' para que coincida perfectamente con el frontend
      res.json({ success: true, reports: result.rows });
    } catch (error) {
      console.error("[ReportController] Error al obtener reportes:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
}