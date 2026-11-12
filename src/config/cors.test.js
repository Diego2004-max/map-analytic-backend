import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCorsOptions } from './cors.js';

function corsResult(origin, configured) {
  let result;
  createCorsOptions(configured).origin(origin, (_error, value) => { result = value; });
  return result;
}

test('allows both production frontends and configured origins', () => {
  assert.equal(corsResult('https://map-analytics-frontend-sooty.vercel.app'), 'https://map-analytics-frontend-sooty.vercel.app');
  assert.equal(corsResult('https://map-analytics-frontend-btb1.vercel.app'), 'https://map-analytics-frontend-btb1.vercel.app');
  assert.equal(corsResult('https://preview.example.com', 'https://preview.example.com'), 'https://preview.example.com');
});

test('rejects unrelated origins and suffix impersonation', () => {
  assert.equal(corsResult('https://unrelated.vercel.app'), false);
  assert.equal(corsResult('https://map-analytics-frontend-sooty.vercel.app.attacker.example'), false);
});
