import { Router } from 'express';
import multer from 'multer';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 4, fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, allowedMimeTypes.has(file.mimetype))
});

export function createReportRouter(controller) {
  const router = Router();
  router.post('/reports', upload.array('attachments', 4), controller.createReport);
  router.get('/reports', controller.getReports);
  router.get('/reports/:reportId/attachments/:attachmentId', controller.getAttachment);
  return router;
}
