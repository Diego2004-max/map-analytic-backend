import { GoogleGenerativeAI } from '@google/generative-ai';

export class NLPClassificationService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async classifyReport(description) {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Analiza la descripción de esta anomalía territorial en Colombia y devuélvela estrictamente en formato JSON plano (sin bloques markdown) con las llaves exactas:
      - category (String: ej. Actividad Sísmica, Infraestructura Vial, Amenaza Geológica, Fenómeno Climático)
      - severity (String estricta: LOW, MEDIUM, HIGH)
      - extractedKeywords (Array de 3 a 5 strings clave)
      - isActionable (Boolean: true/false)

      Descripción: "${description}"`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.warn("[NLP Service] Usando respaldo inteligente local por alta demanda:", error.message);
      const text = description.toLowerCase();
      let category = "Infraestructura Vial";
      let severity = "MEDIUM";

      if (text.includes("sismo") || text.includes("temblor") || text.includes("magnitud")) {
        category = "Actividad Sísmica";
        severity = text.includes("fuerte") || text.includes("destrucción") ? "HIGH" : "MEDIUM";
      } else if (text.includes("deslizamiento") || text.includes("monte") || text.includes("avalancha")) {
        category = "Amenaza Geológica";
        severity = "HIGH";
      }

      return {
        category,
        severity,
        extractedKeywords: description.split(" ").filter(w => w.length > 4).slice(0, 4),
        isActionable: true
      };
    }
  }
}