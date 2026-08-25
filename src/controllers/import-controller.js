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
