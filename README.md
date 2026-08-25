# EPIC CSV Data Import

[![CI](https://github.com/Maahmoudd/aldaleel-csv-task/actions/workflows/ci.yml/badge.svg)](https://github.com/Maahmoudd/aldaleel-csv-task/actions/workflows/ci.yml)

A production-oriented Node.js and Express service for importing customer records from CSV files. It validates uploads and individual rows, processes files asynchronously in streaming batches, stores results in MySQL, and exposes live progress and detailed row-level errors through both a REST API and a small admin console.

## Features

- Multipart CSV upload with extension, MIME type, size, empty-file, and filename validation
- Streaming two-pass CSV parsing without loading the complete file into memory
- Customer schema validation and case-insensitive email deduplication
- Asynchronous in-process processing with persisted progress after each batch
- Detailed import statuses, metrics, and per-row error reports
- Paginated import history
- Responsive admin console at `/`
- MySQL schema managed through Sequelize and Umzug migrations
- Rate limiting, structured Pino request logs, centralized errors, and a health endpoint
- Jest and Supertest unit/integration coverage
- Docker Compose environment, GitHub Actions CI, and a restorable SQL backup

## Architecture

Requests flow through route-specific middleware and controllers into services. Services own import orchestration and use repositories as the only application-facing database layer.

```text
Admin console / API client
          │
          ▼
Express routes → middleware → controllers → services → repositories
                                      │              │
                                      │              └─ MySQL / Sequelize
                                      └─ streaming CSV reader + import queue
```

Key directories:

```text
client/                  Static admin console served by Express
src/config/              Environment, paths, and logging
src/controllers/         HTTP request/response translation
src/database/            Sequelize connection, migrations, seeders, CLI
src/middleware/          Upload, rate limit, validation, and error handling
src/models/              Import and Customer Sequelize models
src/repositories/        Persistence operations
src/routes/              Health and import API routes
src/services/            Import queue, processing, CSV, and query logic
src/validators/          Zod request and customer row schemas
tests/                   Jest unit/integration tests and CSV fixtures
backup/backup.sql        Restorable MySQL schema and representative data
```

## Requirements

- Node.js 22 or newer
- npm
- MySQL 8 when running locally, or Docker with Docker Compose

## Quick start with Docker

Build and start the app and MySQL with one command:

```bash
docker compose up --build
```

Open <http://localhost:3000>. Database migrations run automatically when the application starts. MySQL data and uploaded files use named volumes.

If port 3000 or 3306 is occupied, override the published ports:

```bash
APP_PORT=33000 MYSQL_PORT=33060 docker compose up --build
```

Stop the services without deleting their data:

```bash
docker compose down
```

To also remove the database and upload volumes, run `docker compose down --volumes`. This permanently removes the containerized application data.

## Local setup

1. Install dependencies and create the environment file:

   ```bash
   npm ci
   cp .env.example .env
   ```

2. Start MySQL. The Compose database service is convenient even when Node runs locally:

   ```bash
   docker compose up -d db
   ```

3. Apply migrations and optionally load the fixed demo customer/import identities:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

The admin console and API are available at <http://localhost:3000>. With `DB_MIGRATE_ON_START=true`, startup also applies any pending migrations safely.

## Environment configuration

| Variable                      | Default                                                       | Purpose                                          |
| ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| `NODE_ENV`                    | `development`                                                 | Runtime mode: development, test, or production   |
| `PORT`                        | `3000`                                                        | HTTP port inside the application process         |
| `LOG_LEVEL`                   | `info`                                                        | Pino logging level                               |
| `MAX_FILE_SIZE_MB`            | `5`                                                           | Maximum accepted CSV size                        |
| `UPLOAD_DIR`                  | `./uploads`                                                   | Temporary uploaded-file directory                |
| `UPLOAD_RATE_LIMIT_WINDOW_MS` | `900000`                                                      | Upload rate-limit window (15 minutes)            |
| `UPLOAD_RATE_LIMIT_MAX`       | `20`                                                          | Upload attempts permitted per IP/window          |
| `IMPORT_BATCH_SIZE`           | `100`                                                         | Rows validated and persisted per progress update |
| `DATABASE_URL`                | `mysql://epic_user:epic_password@127.0.0.1:3306/epic_imports` | Sequelize MySQL URL                              |
| `DB_MIGRATE_ON_START`         | `true`                                                        | Apply pending migrations before serving traffic  |
| `DB_SSL`                      | `false`                                                       | Require verified TLS for MySQL                   |
| `DB_POOL_MIN`                 | `0`                                                           | Minimum connection pool size                     |
| `DB_POOL_MAX`                 | `10`                                                          | Maximum connection pool size                     |
| `DB_POOL_ACQUIRE_MS`          | `30000`                                                       | Pool acquisition timeout                         |

## Database commands

```bash
npm run db:migrate       # apply pending migrations
npm run db:migrate:undo  # undo the latest migration
npm run db:seed          # migrate, then apply pending seeders
npm run db:seed:undo     # undo the latest seeder
```

The seed creates one completed import for `demo@example.com`. Migration and seeder execution are tracked separately in `sequelize_migrations` and `sequelize_seeders`.

## Customer CSV schema

The first non-empty row must contain all three required headers. Header matching is case-insensitive and surrounding whitespace is trimmed. Extra columns are accepted but ignored.

| Column  | Required | Validation and normalization                                                                                           |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `name`  | Yes      | Trimmed; 1–100 characters                                                                                              |
| `email` | Yes      | Trimmed; valid email; maximum 254 characters; normalized to lowercase; unique globally                                 |
| `phone` | Yes      | Trimmed; spaces, parentheses, dots, and hyphens removed; 8–15 digits; optional leading `+`; first digit cannot be zero |

Valid example:

```csv
name,email,phone
Ada Lovelace,ada@example.com,+442079460123
Grace Hopper,grace@example.com,+1 (202) 555-0184
```

Blank rows are skipped. Data row numbers in error responses use the physical CSV position, so the first customer row is row 2.

## API

All JSON responses use camelCase. Successful single-resource responses wrap the resource in `data`; errors use `error.code` and `error.message`.

### Upload a CSV

`POST /api/imports`

The multipart field must be named `file`.

```bash
curl -i -X POST http://localhost:3000/api/imports \
  -H 'Accept: application/json' \
  -F 'file=@tests/fixtures/mixed-customers.csv;type=text/csv'
```

Accepted response (`202 Accepted`):

```json
{
  "data": {
    "id": "8f5f15da-13ae-49f8-9d5c-0fc86ac999d4",
    "filename": "mixed-customers.csv",
    "status": "pending",
    "totalRecords": 0,
    "processedRecords": 0,
    "successfulRecords": 0,
    "failedRecords": 0,
    "uploadedAt": "2026-08-25T12:00:00.000Z",
    "statusUrl": "/api/imports/8f5f15da-13ae-49f8-9d5c-0fc86ac999d4"
  }
}
```

The `Location` header contains the polling URL. Common failures are `FILE_REQUIRED` (400), `EMPTY_FILE` (400), `INVALID_FILE_TYPE` (400), and `FILE_TOO_LARGE` (413).

### Get import status and results

`GET /api/imports/:id`

```bash
curl http://localhost:3000/api/imports/8f5f15da-13ae-49f8-9d5c-0fc86ac999d4
```

Completed response:

```json
{
  "data": {
    "id": "8f5f15da-13ae-49f8-9d5c-0fc86ac999d4",
    "filename": "mixed-customers.csv",
    "status": "completed_with_errors",
    "totalRecords": 4,
    "processedRecords": 4,
    "successfulRecords": 2,
    "failedRecords": 2,
    "progressPercentage": 100,
    "uploadedAt": "2026-08-25T12:00:00.000Z",
    "startedAt": "2026-08-25T12:00:00.100Z",
    "completedAt": "2026-08-25T12:00:00.500Z",
    "errors": [
      { "row": 3, "field": "email", "reason": "Email must be a valid email address" },
      { "row": 5, "field": "email", "reason": "Duplicate email within this CSV file" }
    ]
  }
}
```

Statuses are `pending`, `processing`, `completed`, `completed_with_errors`, and `failed`. Responses include `Cache-Control: no-store` so polling clients do not receive stale progress.

### List imports

`GET /api/imports?page=1&limit=20`

`page` starts at 1. `limit` accepts 1–100 and defaults to 20. Results are newest first and omit detailed errors; retrieve an individual import for its error report.

```bash
curl 'http://localhost:3000/api/imports?page=1&limit=10'
```

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

### Health check

`GET /health`

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok" }
```

### Error format

```json
{
  "error": {
    "code": "IMPORT_NOT_FOUND",
    "message": "Import job 00000000-0000-4000-8000-000000000099 was not found"
  }
}
```

Development responses include stack traces for unexpected server errors; production responses never expose them. Additional ready-to-run requests are in [`requests.http`](requests.http).

## Tests and code quality

Create the isolated test database once when testing locally against the Compose MySQL service:

```bash
docker compose up -d db
docker compose exec -e MYSQL_PWD=epic_root_password db \
  mysql -uroot -e "CREATE DATABASE IF NOT EXISTS epic_imports_test; GRANT ALL PRIVILEGES ON epic_imports_test.* TO 'epic_user'@'%';"
```

Then run:

```bash
npm test                 # unit and integration tests
npm run test:coverage    # enforce thresholds and write coverage/lcov-report
npm run lint
npm run format:check
```

Set `TEST_DATABASE_URL` to override the default test connection. As a safety guard, its database name must end in `_test`. Tests migrate and clean that isolated database automatically.

GitHub Actions runs `npm ci`, lint, tests, and coverage against a MySQL 8.4 service on every push and pull request to `main`. Coverage is uploaded as a workflow artifact.

## Database backup and restore

[`backup/backup.sql`](backup/backup.sql) is a MySQL 8.4 dump containing the complete schema, migration/seeder metadata, and representative seed data.

Start MySQL and restore into the configured application database:

```bash
docker compose up -d db
docker compose exec -T -e MYSQL_PWD=epic_root_password db \
  mysql -uroot epic_imports < backup/backup.sql
```

The dump includes `DROP TABLE IF EXISTS` statements. Restoring it replaces the corresponding tables and their data; back up any database you need to retain before running the command.

## Processing decisions and assumptions

- Uploads are accepted only when both the `.csv` extension and MIME type identify CSV content. Allowed MIME types are `text/csv`, `application/csv`, and `application/vnd.ms-excel`.
- A successful upload returns immediately with status `pending`; processing continues in the application queue.
- Files are streamed twice: once to establish the total row count, then again to validate and insert batches. This enables meaningful progress percentages without holding the file in memory.
- Progress and the current error report are persisted after every `IMPORT_BATCH_SIZE` rows.
- Emails are normalized to lowercase. Duplicates within one file and emails already imported by any earlier job fail the affected row.
- Valid rows in a mixed file are retained; its final status is `completed_with_errors`.
- Structurally invalid CSV, missing headers, missing stored files, or unexpected processing failures produce `failed`.
- Uploaded CSV files are removed after processing succeeds or fails. Import metrics and errors remain in MySQL.
- MySQL was selected as the SQL backend and is included in Compose. This differs from the assessment's preferred self-contained SQLite option but retains migrations, relational constraints, persistence, and a portable SQL dump.

## Known limitations / incomplete items

- The API and admin console do not implement authentication or authorization. They must be placed behind an administrator identity layer before public deployment.
- The import queue runs in the Node process rather than a dedicated worker system. Pending and interrupted jobs resume at startup, but the design is intended for a single application replica and does not provide distributed locking.
- Duplicate detection across concurrent imports relies on the database unique constraint after the pre-insert check; competing batches could cause one whole job to fail rather than reporting only the colliding row.
- Per-row errors are stored as one JSON value and returned together. Very large failure reports are not paginated and could grow substantially within the 5 MB upload limit.
- Counting rows requires a second streaming pass over each file. This trades extra file I/O for accurate pollable progress.
- Processed source files are intentionally deleted, so the system does not provide original-file download or audit retention.
- The admin console displays the eight newest jobs; full pagination remains available through the API.
- MySQL is used instead of the assessment's preferred SQLite or alternative Postgres setup; therefore the backup deliverable is a MySQL dump rather than a raw SQLite file.

See [`TASKS.md`](TASKS.md) for the complete TASK-001–013 implementation map.
