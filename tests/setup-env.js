const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'mysql://epic_user:epic_password@127.0.0.1:3306/epic_imports_test';
const databaseName = new URL(testDatabaseUrl).pathname.slice(1);

if (!databaseName.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL must target a database whose name ends in "_test"');
}

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DB_MIGRATE_ON_START = 'false';
process.env.IMPORT_BATCH_SIZE = '2';
process.env.MAX_FILE_SIZE_MB = '0.01';
process.env.UPLOAD_DIR = `/tmp/epic-csv-import-tests-${process.pid}`;
process.env.UPLOAD_RATE_LIMIT_MAX = '1000';
