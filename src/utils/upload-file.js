import { unlink } from 'node:fs/promises';

import { logger } from '../config/logger.js';

export async function removeUploadedFile(filePath) {
  if (!filePath) return;

  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn({ err: error, filePath }, 'Could not remove uploaded file');
    }
  }
}
