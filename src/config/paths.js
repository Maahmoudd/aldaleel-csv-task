import path from 'node:path';

import { env } from './env.js';

export const uploadDirectory = path.resolve(env.UPLOAD_DIR);

export function resolveUploadPath(storageKey) {
  const filePath = path.resolve(uploadDirectory, storageKey);
  if (path.dirname(filePath) !== uploadDirectory) {
    throw new Error('Invalid upload storage key');
  }
  return filePath;
}
