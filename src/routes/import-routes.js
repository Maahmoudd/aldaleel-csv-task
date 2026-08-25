import { Router } from 'express';

import { uploadImport } from '../controllers/import-controller.js';
import { handleCsvUpload } from '../middleware/upload.js';
import { uploadRateLimit } from '../middleware/upload-rate-limit.js';

export const importRouter = Router();

importRouter.post('/', uploadRateLimit, handleCsvUpload, uploadImport);
