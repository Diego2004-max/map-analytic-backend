import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnomalyMonitorService } from './anomaly-monitor.service.js';

test('returns all valid daily events without truncating chart data', async (context) => {
  const features = Array.from({ length: 20 }, (_, index) => ({ id: String(index), geometry: { coordinates: [120, 30, 10] }, properties: { mag: 4, time: 1700000000000 + index, place: 'Test event' } }));
  features.push({ geometry: { coordinates: [120, 30, 10] }, properties: { mag: null, time: 1700000000000 } });
  context.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ features }) }));
  const result = await new AnomalyMonitorService().scanTerritorialAnomalies();
  assert.equal(result.international.length, 20);
  assert.equal(result.international[0].id, '19');
  assert.equal(result.national.length, 0);
});
