import test from 'node:test';
import assert from 'node:assert/strict';
import { ReportRetentionService } from './report-retention.service.js';
test('retention deletes only expired reports and records the result', async () => {
  const service = new ReportRetentionService({ query: async (sql) => {
    assert.match(sql, /created_at < NOW\(\) - INTERVAL '1 hour'/);
    return { rowCount: 3 };
  } });
  await service.run();
  assert.equal(service.lastRun.deleted, 3);
  assert.equal(service.running, false);
});
test('retention releases its lock after database failure', async () => {
  const service = new ReportRetentionService({ query: async () => { throw new Error('offline'); } });
  await assert.rejects(service.run(), /offline/);
  assert.equal(service.running, false);
  assert.equal(service.lastRun.status, 'error');
});
