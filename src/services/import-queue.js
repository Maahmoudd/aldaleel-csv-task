import { logger } from '../config/logger.js';
import { findIncompleteImports } from '../repositories/import-repository.js';
import { processImportJob } from './import-processor.js';

const queuedImportIds = new Set();
let queueTail = Promise.resolve();

export function enqueueImport(importId) {
  if (queuedImportIds.has(importId)) return queueTail;

  queuedImportIds.add(importId);
  const task = queueTail.then(() => processImportJob(importId));
  queueTail = task
    .catch((error) => {
      logger.error({ err: error, importId }, 'Unexpected import queue failure');
    })
    .finally(() => {
      queuedImportIds.delete(importId);
    });

  return queueTail;
}

export async function resumeIncompleteImports() {
  const imports = await findIncompleteImports();
  for (const importJob of imports) {
    enqueueImport(importJob.id);
  }
  if (imports.length > 0) {
    logger.info({ count: imports.length }, 'Queued incomplete imports for recovery');
  }
}

export function waitForImportQueue() {
  return queueTail;
}
