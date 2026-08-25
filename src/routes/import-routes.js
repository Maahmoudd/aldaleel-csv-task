import { Router } from 'express';

import { getImport, listImports, uploadImport } from '../controllers/import-controller.js';
import { handleCsvUpload } from '../middleware/upload.js';
import { uploadRateLimit } from '../middleware/upload-rate-limit.js';
import { validateRequest } from '../middleware/validate-request.js';
import {
  importIdParamsSchema,
  importListQuerySchema,
} from '../validators/import-request-validator.js';

export const importRouter = Router();

importRouter.get('/', validateRequest({ query: importListQuerySchema }), listImports);
importRouter.get('/:id', validateRequest({ params: importIdParamsSchema }), getImport);
importRouter.post('/', uploadRateLimit, handleCsvUpload, uploadImport);
