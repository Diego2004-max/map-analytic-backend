export class ReportRetentionService {
  constructor(pool) { this.pool = pool; this.running = false; this.lastRun = null; }
  async run() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.pool.query("DELETE FROM anomaly_reports WHERE created_at < NOW() - INTERVAL '1 hour'");
      this.lastRun = { timestamp: new Date().toISOString(), deleted: result.rowCount, status: 'ok' };
    } catch (error) {
      this.lastRun = { timestamp: new Date().toISOString(), status: 'error' };
      throw error;
    } finally { this.running = false; }
  }
}
