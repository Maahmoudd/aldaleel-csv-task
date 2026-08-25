import { findImportById, findImports } from '../repositories/import-repository.js';
import { AppError } from '../utils/app-error.js';

function progressFor(importJob) {
  if (importJob.totalRecords === 0) return 0;
  return Math.round((importJob.processedRecords / importJob.totalRecords) * 10000) / 100;
}

export function serializeImport(importJob, { includeErrors = true } = {}) {
  const result = {
    id: importJob.id,
    filename: importJob.filename,
    status: importJob.status,
    totalRecords: importJob.totalRecords,
    processedRecords: importJob.processedRecords,
    successfulRecords: importJob.successfulRecords,
    failedRecords: importJob.failedRecords,
    progressPercentage: progressFor(importJob),
    uploadedAt: importJob.uploadedAt,
    startedAt: importJob.startedAt,
    completedAt: importJob.completedAt,
  };

  if (includeErrors) {
    result.errors = Array.isArray(importJob.errorReport) ? importJob.errorReport : [];
  }

  return result;
}

export async function getImportResult(id) {
  const importJob = await findImportById(id);
  if (!importJob) {
    throw new AppError(404, 'IMPORT_NOT_FOUND', `Import job ${id} was not found`);
  }
  return serializeImport(importJob);
}

export async function listImportResults({ page, limit }) {
  const offset = (page - 1) * limit;
  const { count, rows } = await findImports({ limit, offset });

  return {
    data: rows.map((importJob) => serializeImport(importJob, { includeErrors: false })),
    pagination: {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}
