import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { resolveUploadPath } from '../config/paths.js';
import {
  deleteCustomersForImport,
  findExistingEmails,
  insertCustomers,
} from '../repositories/customer-repository.js';
import { findImportById, updateImport } from '../repositories/import-repository.js';
import { removeUploadedFile } from '../utils/upload-file.js';
import { validateCustomerRow } from '../validators/customer-row-validator.js';
import { countCsvRecords, CsvStructureError, forEachCsvRecord } from './csv-reader.js';

function rowErrors(rowNumber, errors) {
  return errors.map(({ field, reason }) => ({ row: rowNumber, field, reason }));
}

function fatalError(error) {
  if (error instanceof CsvStructureError) {
    return { row: 1, field: error.field, reason: error.message };
  }
  if (error.code?.startsWith('CSV_')) {
    return { row: error.lines ?? 1, field: 'file', reason: `Malformed CSV: ${error.message}` };
  }
  if (error.code === 'ENOENT') {
    return { row: 1, field: 'file', reason: 'The uploaded CSV file is no longer available' };
  }
  return { row: 1, field: 'file', reason: 'The import could not be processed' };
}

async function persistProgress(importJob, metrics) {
  await updateImport(importJob, {
    processedRecords: metrics.processed,
    successfulRecords: metrics.successful,
    failedRecords: metrics.failed,
    errorReport: [...metrics.errors],
  });
}

async function flushBatch(importJob, batch, metrics) {
  if (batch.length === 0) return;

  const candidates = [];
  for (const { record, rowNumber } of batch) {
    const validation = validateCustomerRow(record);
    if (!validation.success) {
      metrics.failed += 1;
      metrics.errors.push(...rowErrors(rowNumber, validation.errors));
      continue;
    }

    if (metrics.seenEmails.has(validation.data.email)) {
      metrics.failed += 1;
      metrics.errors.push({
        row: rowNumber,
        field: 'email',
        reason: 'Duplicate email within this CSV file',
      });
      continue;
    }

    metrics.seenEmails.add(validation.data.email);
    candidates.push({ rowNumber, customer: validation.data });
  }

  const existingEmails = await findExistingEmails(candidates.map(({ customer }) => customer.email));
  const customersToInsert = [];

  for (const { rowNumber, customer } of candidates) {
    if (existingEmails.has(customer.email)) {
      metrics.failed += 1;
      metrics.errors.push({
        row: rowNumber,
        field: 'email',
        reason: 'Email already exists from a previous import',
      });
      continue;
    }

    customersToInsert.push({ ...customer, importId: importJob.id });
  }

  await insertCustomers(customersToInsert);
  metrics.successful += customersToInsert.length;
  metrics.processed += batch.length;
  await persistProgress(importJob, metrics);
}

export async function processImportJob(importId) {
  const importJob = await findImportById(importId);
  if (!importJob || !['pending', 'processing'].includes(importJob.status)) return;

  let filePath;
  const metrics = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: [],
    seenEmails: new Set(),
  };

  try {
    filePath = resolveUploadPath(importJob.storageKey);
    await deleteCustomersForImport(importJob.id);
    await updateImport(importJob, {
      status: 'processing',
      totalRecords: 0,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errorReport: [],
      startedAt: new Date(),
      completedAt: null,
    });

    const totalRecords = await countCsvRecords(filePath);
    if (totalRecords === 0) {
      throw new CsvStructureError('The CSV contains a header but no customer rows');
    }
    await updateImport(importJob, { totalRecords });

    let batch = [];
    await forEachCsvRecord(filePath, async (record, rowNumber) => {
      batch.push({ record, rowNumber });
      if (batch.length >= env.IMPORT_BATCH_SIZE) {
        await flushBatch(importJob, batch, metrics);
        batch = [];
      }
    });
    await flushBatch(importJob, batch, metrics);

    await updateImport(importJob, {
      status: metrics.failed > 0 ? 'completed_with_errors' : 'completed',
      completedAt: new Date(),
    });
    logger.info(
      {
        importId,
        processed: metrics.processed,
        successful: metrics.successful,
        failed: metrics.failed,
      },
      'CSV import completed',
    );
  } catch (error) {
    metrics.errors.push(fatalError(error));
    try {
      await updateImport(importJob, {
        status: 'failed',
        processedRecords: metrics.processed,
        successfulRecords: metrics.successful,
        failedRecords: metrics.failed,
        errorReport: [...metrics.errors],
        completedAt: new Date(),
      });
    } catch (updateError) {
      logger.error({ err: updateError, importId }, 'Could not persist failed import status');
    }
    logger.error({ err: error, importId }, 'CSV import failed');
  } finally {
    if (filePath) {
      await removeUploadedFile(filePath);
    }
  }
}
