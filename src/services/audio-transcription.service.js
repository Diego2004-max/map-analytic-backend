import { GoogleGenAI } from '@google/genai';

export class AudioTranscriptionService {
  constructor(apiKey = process.env.GEMINI_API_KEY) {
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async transcribe(file) {
    if (!this.client) throw new Error('Audio transcription is not configured.');
    const response = await this.client.models.generateContent({
      model: process.env.GEMINI_AUDIO_MODEL || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [
        { text: 'Transcribe fielmente en español el contenido hablado de este audio para un reporte territorial. Devuelve solo la transcripción. Si no hay voz inteligible, devuelve una cadena vacía.' },
        { inlineData: { mimeType: file.mimetype, data: file.buffer.toString('base64') } }
      ] }]
    });
    return (response.text || '').trim();
  }
}
