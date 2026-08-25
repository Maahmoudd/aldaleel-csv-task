# Assessment task map

All required user stories and tasks are implemented.

## US-001 — Upload

- [x] **TASK-001 — Upload endpoint:** `POST /api/imports` accepts one multipart `file` through `src/routes/import-routes.js` and `src/middleware/upload.js`.
- [x] **TASK-002 — Missing/empty validation:** `src/services/import-service.js` returns structured `FILE_REQUIRED` and `EMPTY_FILE` 400 errors and cleans rejected files.
- [x] **TASK-003 — File type validation:** `src/middleware/upload.js` requires a `.csv` extension and an allowed CSV MIME type.
- [x] **TASK-004 — File size validation:** Multer enforces configurable `MAX_FILE_SIZE_MB` and maps overflow to `FILE_TOO_LARGE` (413).
- [x] **TASK-005 — Persist import job:** `src/services/import-service.js` and `src/repositories/import-repository.js` create a UUID-backed `pending` import with its original filename, storage key, timestamps, and zeroed metrics before enqueueing it.

## US-002 — Processing

- [x] **TASK-005 — Stream-parse CSV:** `src/services/csv-reader.js` uses `csv-parse` with file streams for counting and processing.
- [x] **TASK-006 — Validate rows:** `src/validators/customer-row-validator.js` validates and normalizes `name`, `email`, and `phone`; `src/services/import-processor.js` detects duplicate emails within and across imports.
- [x] **TASK-007 — Insert valid records:** valid batches are persisted through `src/repositories/customer-repository.js` into the MySQL `customers` table with an import foreign key.
- [x] **TASK-008 — Track progress:** total, processed, successful, failed, and current error metrics are saved after each configurable batch.
- [x] **TASK-009 — Final status/errors:** jobs end as `completed`, `completed_with_errors`, or `failed`, with completion time and `{ row, field, reason }` errors stored as JSON.

## US-003 — Results

- [x] **TASK-010 — Import status API:** `GET /api/imports/:id` validates UUIDs and returns current status, progress, timestamps, metrics, and errors.
- [x] **TASK-011 — Total records:** responses include `totalRecords` from the streaming count pass.
- [x] **TASK-012 — Successful records:** responses include `successfulRecords` from persisted batch metrics.
- [x] **TASK-013 — Failed records/details:** responses include `failedRecords` and the complete row-level `errors` list.

## Additional deliverables

- [x] Paginated, newest-first `GET /api/imports`
- [x] MySQL schema, Sequelize models, Umzug migrations, and seed data
- [x] Centralized errors, Zod request validation, Pino HTTP logging, and upload rate limiting
- [x] Unit and integration tests with valid, mixed, empty, and malformed fixtures
- [x] Multi-stage non-root Docker image and health-checked Docker Compose stack
- [x] GitHub Actions lint/test/coverage workflow
- [x] Validated SQL backup in `backup/backup.sql`
- [x] Admin console with drag/drop upload, progress polling, metrics, recent jobs, and errors
- [x] API request examples in `requests.http`
- [x] Health check at `GET /health`
