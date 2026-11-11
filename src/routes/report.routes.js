import { Router } from 'express';
export function createReportRouter(controller) {
  const router = Router();
  router.post('/reports', controller.createReport);
  router.get('/reports', controller.getReports);
  return router;
}
