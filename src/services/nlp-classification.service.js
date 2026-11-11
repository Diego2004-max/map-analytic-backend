/**
 * @file nlp-classification.service.js
 * @description Service to handle AI classification via Gemini API.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

export class NLPClassificationService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async classifyReport(description) {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Analiza la siguiente descripción de una anomalía o fenómeno natural territorial (sismos, volcanes, clima, geología) y devuélvela estrictamente en formato JSON plano (sin bloques de código markdown) con las siguientes llaves exactas: 
      - category (String: ej. Sísmico, Volcánico, Climático, Geológico, Infraestructura)
      - severity (String estricta: LOW, MEDIUM o HIGH)
      - extractedKeywords (Array de strings con 3 a 5 palabras clave relevantes)
      - isActionable (Boolean: true o false)

      Descripción: "${description}"`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.warn("[NLP Service] Aplicando clasificación inteligente para fenómenos naturales:", error.message);
      
      const text = description.toLowerCase();
      let category = "Fenómeno Natural";
      let severity = "MEDIUM";
      let isActionable = true;

      // Detección especializada para sismos, volcanes y naturaleza
      if (text.includes("sismo") || text.includes("temblor") || text.includes("terremoto") || text.includes("magnitúd")) {
        category = "Actividad Sísmica";
        severity = text.includes("fuerte") || text.includes("magnitud") || text.includes("destrucción") ? "HIGH" : "MEDIUM";
      } else if (text.includes("volcán") || text.includes("ceniza") || text.includes("erupción") || text.includes("cráter")) {
        category = "Actividad Volcánica";
        severity = "HIGH";
      } else if (text.includes("deslizamiento") || text.includes("derrumbe") || text.includes("avalancha") || text.includes("grieta")) {
        category = "Amenaza Geológica";
        severity = "HIGH";
      } else if (text.includes("inundación") || text.includes("crecida") || text.includes("tormenta") || text.includes("lluvia")) {
        category = "Fenómeno Climático";
        severity = "MEDIUM";
      }

      const keywords = description.split(" ").filter(w => w.length > 3).slice(0, 4);

      return {
        category,
        severity,
        extractedKeywords: keywords.length > 0 ? keywords : ["fenómeno", "natural"],
        isActionable
      };
    }
  }
}