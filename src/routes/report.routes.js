import { Router } from 'express';
import multer from 'multer';
import { requireSession } from '../middleware/session.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 4, fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, allowedMimeTypes.has(file.mimetype.split(';')[0].trim().toLowerCase()))
});

export function createReportRouter(controller) {
  const router = Router();
  router.post('/reports', requireSession, upload.array('attachments', 4), controller.createReport);
  router.delete('/reports/:reportId', requireSession, controller.deleteReport);
  router.get('/reports', controller.getReports);
  router.get('/reports/stats', controller.getStats);
  router.get('/reports/:reportId/attachments/:attachmentId', controller.getAttachment);
  return router;
}
