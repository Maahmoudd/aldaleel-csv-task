import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import request from 'supertest';

import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { uploadDirectory } from '../../src/config/paths.js';
import {
  closeDatabase,
  createMigrator,
  migrateDatabase,
  models,
  sequelize,
} from '../../src/database/index.js';
import { waitForImportQueue } from '../../src/services/import-queue.js';

const fixturesDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');
const app = createApp();
const api = request(app);
const terminalStatuses = new Set(['completed', 'completed_with_errors', 'failed']);

function fixture(name) {
  return path.join(fixturesDirectory, name);
}

async function waitForImport(id, { observeProgress = false } = {}) {
  let sawIncrementalProgress = false;

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const response = await api.get(`/api/imports/${id}`);
    expect(response.status).toBe(200);

    const importJob = response.body.data;
    if (
      importJob.status === 'processing' &&
      importJob.totalRecords > 0 &&
      importJob.processedRecords > 0 &&
      importJob.processedRecords < importJob.totalRecords
    ) {
      sawIncrementalProgress = true;
    }

    if (terminalStatuses.has(importJob.status)) {
      if (observeProgress) expect(sawIncrementalProgress).toBe(true);
      return importJob;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Import ${id} did not reach a terminal status`);
}

async function uploadBuffer(contents, filename = 'customers.csv', contentType = 'text/csv') {
  return api.post('/api/imports').attach('file', contents, { filename, contentType });
}

beforeAll(async () => {
  const databaseName = new URL(env.DATABASE_URL).pathname.slice(1);
  if (!databaseName.endsWith('_test')) {
    throw new Error('Integration tests refused to use a non-test database');
  }

  await migrateDatabase();
  await sequelize.authenticate();
});

beforeEach(async () => {
  await waitForImportQueue();
  await models.Customer.destroy({ where: {} });
  await models.Import.destroy({ where: {} });
  await rm(uploadDirectory, { recursive: true, force: true });
  await mkdir(uploadDirectory, { recursive: true });
});

afterAll(async () => {
  await waitForImportQueue();
  await rm(uploadDirectory, { recursive: true, force: true });
  await createMigrator(sequelize).down({ to: 0 });
  await closeDatabase();
});

describe('POST /api/imports file validation', () => {
  it('rejects a missing file', async () => {
    const response = await api.post('/api/imports');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('FILE_REQUIRED');
  });

  it('rejects an empty CSV', async () => {
    const response = await uploadBuffer(Buffer.alloc(0), 'empty.csv');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('EMPTY_FILE');
  });

  it.each([
    ['customers.txt', 'text/csv'],
    ['customers.csv', 'text/plain'],
  ])('rejects invalid extension/MIME combination %s %s', async (filename, contentType) => {
    const response = await uploadBuffer(Buffer.from('name,email,phone\n'), filename, contentType);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects a CSV above the configured size limit', async () => {
    const response = await uploadBuffer(Buffer.alloc(env.maxFileSizeBytes + 1), 'large.csv');

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('FILE_TOO_LARGE');
  });
});

describe('CSV import processing and results', () => {
  it('completes the full upload, processing, and status flow', async () => {
    const upload = await api
      .post('/api/imports')
      .attach('file', fixture('valid-customers.csv'), { contentType: 'text/csv' });

    expect(upload.status).toBe(202);
    expect(upload.body.data.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(upload.headers.location).toBe(upload.body.data.statusUrl);

    const result = await waitForImport(upload.body.data.id);
    expect(result).toMatchObject({
      filename: 'valid-customers.csv',
      status: 'completed',
      totalRecords: 2,
      processedRecords: 2,
      successfulRecords: 2,
      failedRecords: 0,
      progressPercentage: 100,
      errors: [],
    });
    expect(await models.Customer.count()).toBe(2);
  });

  it('reports invalid and duplicate rows with row-level details', async () => {
    const upload = await api
      .post('/api/imports')
      .attach('file', fixture('mixed-customers.csv'), { contentType: 'text/csv' });
    const result = await waitForImport(upload.body.data.id);

    expect(result).toMatchObject({
      status: 'completed_with_errors',
      totalRecords: 4,
      processedRecords: 4,
      successfulRecords: 1,
      failedRecords: 3,
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 3, field: 'email' }),
        expect.objectContaining({ row: 4, field: 'phone' }),
        expect.objectContaining({
          row: 5,
          field: 'email',
          reason: expect.stringContaining('Duplicate'),
        }),
      ]),
    );
  });

  it('rejects an email imported by an earlier job', async () => {
    const firstUpload = await uploadBuffer(
      Buffer.from('name,email,phone\nFirst,shared@example.com,+12025550123\n'),
      'first.csv',
    );
    await waitForImport(firstUpload.body.data.id);

    const secondUpload = await uploadBuffer(
      Buffer.from(
        'name,email,phone\nExisting,shared@example.com,+12025550124\nNew,new@example.com,+12025550125\n',
      ),
      'second.csv',
    );
    const result = await waitForImport(secondUpload.body.data.id);

    expect(result).toMatchObject({
      status: 'completed_with_errors',
      totalRecords: 2,
      successfulRecords: 1,
      failedRecords: 1,
    });
    expect(result.errors[0]).toEqual({
      row: 2,
      field: 'email',
      reason: 'Email already exists from a previous import',
    });
  });

  it('marks structurally malformed CSV as failed', async () => {
    const upload = await api
      .post('/api/imports')
      .attach('file', fixture('malformed-customers.csv'), { contentType: 'text/csv' });
    const result = await waitForImport(upload.body.data.id);

    expect(result.status).toBe('failed');
    expect(result.errors).toEqual([
      expect.objectContaining({
        row: 1,
        field: 'header',
        reason: expect.stringContaining('phone'),
      }),
    ]);
  });

  it('persists observable progress before a larger import completes', async () => {
    const csvRows = ['name,email,phone'];
    for (let index = 0; index < 80; index += 1) {
      csvRows.push(`Customer ${index},customer${index}@example.com,+1202555${1000 + index}`);
    }

    const upload = await uploadBuffer(Buffer.from(csvRows.join('\n')), 'progress.csv');
    const result = await waitForImport(upload.body.data.id, { observeProgress: true });

    expect(result).toMatchObject({
      status: 'completed',
      totalRecords: 80,
      processedRecords: 80,
      successfulRecords: 80,
    });
  });
});

describe('GET /api/imports', () => {
  it('returns 404 for an unknown import and 400 for an invalid ID', async () => {
    const missing = await api.get('/api/imports/00000000-0000-4000-8000-000000000099');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('IMPORT_NOT_FOUND');

    const invalid = await api.get('/api/imports/not-a-uuid');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists jobs with validated pagination and newest-first ordering', async () => {
    const older = await models.Import.create({
      filename: 'older.csv',
      storageKey: 'older.csv',
      status: 'completed',
      uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
      completedAt: new Date('2026-01-01T00:00:01.000Z'),
    });
    const newer = await models.Import.create({
      filename: 'newer.csv',
      storageKey: 'newer.csv',
      status: 'completed',
      uploadedAt: new Date('2026-01-02T00:00:00.000Z'),
      completedAt: new Date('2026-01-02T00:00:01.000Z'),
    });

    const firstPage = await api.get('/api/imports?page=1&limit=1');
    expect(firstPage.status).toBe(200);
    expect(firstPage.headers['cache-control']).toBe('no-store');
    expect(firstPage.body.data).toHaveLength(1);
    expect(firstPage.body.data[0].id).toBe(newer.id);
    expect(firstPage.body.data[0]).not.toHaveProperty('errors');
    expect(firstPage.body.pagination).toEqual({
      page: 1,
      limit: 1,
      totalItems: 2,
      totalPages: 2,
    });

    const secondPage = await api.get('/api/imports?page=2&limit=1');
    expect(secondPage.body.data[0].id).toBe(older.id);

    const invalidPage = await api.get('/api/imports?page=0&limit=101');
    expect(invalidPage.status).toBe(400);
    expect(invalidPage.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('service endpoints', () => {
  it('serves the admin console, health, and structured unknown-route responses', async () => {
    const frontend = await api.get('/');
    expect(frontend.status).toBe(200);
    expect(frontend.headers['content-type']).toContain('text/html');
    expect(frontend.text).toContain('CSV Import Console');

    const health = await api.get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });

    const unknown = await api.get('/unknown-route');
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('NOT_FOUND');
  });
});
