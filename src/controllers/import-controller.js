import { getImportResult, listImportResults } from '../services/import-query-service.js';
import { createImportJob } from '../services/import-service.js';

function serializeCreatedImport(importJob) {
  return {
    id: importJob.id,
    filename: importJob.filename,
    status: importJob.status,
    totalRecords: importJob.totalRecords,
    processedRecords: importJob.processedRecords,
    successfulRecords: importJob.successfulRecords,
    failedRecords: importJob.failedRecords,
    uploadedAt: importJob.uploadedAt,
    statusUrl: `/api/imports/${importJob.id}`,
  };
}

export async function uploadImport(request, response) {
  const importJob = await createImportJob(request.file);
  const statusUrl = `/api/imports/${importJob.id}`;

  response
    .location(statusUrl)
    .status(202)
    .json({
      data: serializeCreatedImport(importJob),
    });
}

export async function getImport(request, response) {
  const result = await getImportResult(request.validated.params.id);
  response.set('Cache-Control', 'no-store').status(200).json({ data: result });
}

export async function listImports(request, response) {
  const result = await listImportResults(request.validated.query);
  response.set('Cache-Control', 'no-store').status(200).json(result);
}
