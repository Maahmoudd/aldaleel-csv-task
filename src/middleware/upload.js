import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import multer from 'multer';

import { env } from '../config/env.js';
import { uploadDirectory } from '../config/paths.js';
import { AppError } from '../utils/app-error.js';

const allowedMimeTypes = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel']);

mkdirSync(uploadDirectory, { recursive: true });

const csvUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_request, _file, callback) => callback(null, `${randomUUID()}.csv`),
  }),
  limits: {
    fileSize: env.maxFileSizeBytes,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    const hasCsvExtension = path.extname(file.originalname).toLowerCase() === '.csv';
    const mimeType = file.mimetype.toLowerCase();

    if (!hasCsvExtension || !allowedMimeTypes.has(mimeType)) {
      callback(
        new AppError(
          400,
          'INVALID_FILE_TYPE',
          'Only CSV files are accepted (valid .csv extension and CSV MIME type required)',
        ),
      );
      return;
    }

    callback(null, true);
  },
});

function mapMulterError(error) {
  if (!(error instanceof multer.MulterError)) return error;

  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError(
      413,
      'FILE_TOO_LARGE',
      `The CSV file exceeds the ${env.MAX_FILE_SIZE_MB}MB upload limit`,
    );
  }

  if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(400, 'INVALID_FILE_UPLOAD', 'Upload exactly one CSV in the "file" field');
  }

  return new AppError(
    400,
    'INVALID_MULTIPART_REQUEST',
    'The multipart upload could not be processed',
  );
}

export function handleCsvUpload(request, response, next) {
  csvUpload.single('file')(request, response, (error) => {
    if (error) {
      next(mapMulterError(error));
      return;
    }
    next();
  });
}
