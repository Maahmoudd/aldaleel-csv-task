import { models } from '../database/index.js';

export async function createImport({ filename, storageKey }) {
  return models.Import.create({
    filename,
    storageKey,
    status: 'pending',
    errorReport: [],
  });
}
