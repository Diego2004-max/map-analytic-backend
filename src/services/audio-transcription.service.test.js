import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AudioTranscriptionService, providerStatus } from './audio-transcription.service.js';

test('recognizes structured and serialized provider status', () => {
  assert.equal(providerStatus({ status: 503 }), 503);
  assert.equal(providerStatus({ message: '{"error":{"code":404}}' }), 404);
});

test('uses available fallback when preferred model is unavailable', async () => {
  const service = new AudioTranscriptionService();
  const models = [];
  service.client = { models: { generateContent: async ({ model }) => {
    models.push(model);
    if (models.length === 1) throw { status: 503 };
    return { text: 'Se presentó un deslizamiento.' };
  } } };
  const previous = process.env.GEMINI_AUDIO_MODEL;
  process.env.GEMINI_AUDIO_MODEL = 'gemini-3.8-flash';
  try {
    const transcript = await service.transcribe({ mimetype: 'audio/webm', buffer: Buffer.from('audio') });
    assert.equal(transcript, 'Se presentó un deslizamiento.');
    assert.deepEqual(models, ['gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_AUDIO_MODEL;
    else process.env.GEMINI_AUDIO_MODEL = previous;
  }
});
