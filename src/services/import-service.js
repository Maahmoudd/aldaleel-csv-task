import path from 'node:path';

import { createImport } from '../repositories/import-repository.js';
import { AppError } from '../utils/app-error.js';
import { removeUploadedFile } from '../utils/upload-file.js';
import { enqueueImport } from './import-queue.js';

export async function createImportJob(file) {
  if (!file) {
    throw new AppError(400, 'FILE_REQUIRED', 'A CSV file is required in the "file" field');
  }

  if (file.size === 0) {
    await removeUploadedFile(file.path);
    throw new AppError(400, 'EMPTY_FILE', 'The uploaded CSV file is empty');
  }

  const filename = path.basename(file.originalname).trim();
  if (!filename || filename.length > 255) {
    await removeUploadedFile(file.path);
    throw new AppError(
      400,
      'INVALID_FILENAME',
      'The CSV filename must be between 1 and 255 characters',
    );
  }

  try {
    const importJob = await createImport({
      filename,
      storageKey: file.filename,
    });
    enqueueImport(importJob.id);
    return importJob;
  } catch (error) {
    await removeUploadedFile(file.path);
    throw error;
  }
}
