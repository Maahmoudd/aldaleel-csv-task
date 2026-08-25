import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

import { parse } from 'csv-parse';

const requiredHeaders = ['name', 'email', 'phone'];

export class CsvStructureError extends Error {
  constructor(message, field = 'file') {
    super(message);
    this.name = 'CsvStructureError';
    this.field = field;
  }
}

function normalizeAndValidateHeaders(headers) {
  const normalized = headers.map((header) => header.trim().toLowerCase());
  const duplicateHeaders = normalized.filter(
    (header, index) => normalized.indexOf(header) !== index,
  );
  if (duplicateHeaders.length > 0) {
    throw new CsvStructureError(`Duplicate CSV header: ${duplicateHeaders[0]}`, 'header');
  }

  const missingHeaders = requiredHeaders.filter((header) => !normalized.includes(header));
  if (missingHeaders.length > 0) {
    throw new CsvStructureError(
      `Missing required CSV header(s): ${missingHeaders.join(', ')}`,
      'header',
    );
  }

  return normalized;
}

function createParser() {
  return parse({
    bom: true,
    columns: normalizeAndValidateHeaders,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  });
}

export async function forEachCsvRecord(filePath, onRecord) {
  let recordNumber = 0;

  await pipeline(createReadStream(filePath), createParser(), async (records) => {
    for await (const record of records) {
      recordNumber += 1;
      await onRecord(record, recordNumber + 1);
    }
  });

  return recordNumber;
}

export async function countCsvRecords(filePath) {
  return forEachCsvRecord(filePath, () => {});
}
