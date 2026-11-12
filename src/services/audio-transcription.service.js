import { GoogleGenAI } from '@google/genai';

function providerStatus(error) {
  const direct = Number(error.status || error.code);
  if (Number.isInteger(direct)) return direct;
  const match = String(error.message || '').match(/"code"\s*:\s*(\d{3})/);
  return match ? Number(match[1]) : null;
}

export class AudioTranscriptionService {
  constructor(apiKey = process.env.GEMINI_API_KEY) {
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async transcribe(file) {
    if (!this.client) throw new Error('Audio transcription is not configured.');
    const contents = [{ role: 'user', parts: [
        { text: 'Transcribe fielmente en español el contenido hablado de este audio para un reporte territorial. Devuelve solo la transcripción. Si no hay voz inteligible, devuelve una cadena vacía.' },
        { inlineData: { mimeType: file.mimetype.split(';')[0].trim().toLowerCase(), data: file.buffer.toString('base64') } }
      ] }];
    const preferredModel = process.env.GEMINI_AUDIO_MODEL || 'gemini-3.5-flash-lite';
    try {
      const response = await this.client.models.generateContent({ model: preferredModel, contents });
      return (response.text || '').trim();
    } catch (error) {
      if (preferredModel === 'gemini-3.5-flash-lite' || ![404, 429, 503].includes(providerStatus(error))) throw error;
      const response = await this.client.models.generateContent({ model: 'gemini-3.5-flash-lite', contents });
      return (response.text || '').trim();
    }
  }
}

export { providerStatus };
