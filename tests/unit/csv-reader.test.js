import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { countCsvRecords, CsvStructureError } from '../../src/services/csv-reader.js';

const fixturesDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');

describe('CSV reader', () => {
  it('stream-counts data records without counting the header', async () => {
    await expect(
      countCsvRecords(path.join(fixturesDirectory, 'valid-customers.csv')),
    ).resolves.toBe(2);
  });

  it('rejects a file missing required headers', async () => {
    await expect(
      countCsvRecords(path.join(fixturesDirectory, 'malformed-customers.csv')),
    ).rejects.toEqual(expect.any(CsvStructureError));
  });
});
