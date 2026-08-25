import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabase, migrateDatabase, sequelize } from './database/index.js';
import { logger } from './config/logger.js';
import { resumeIncompleteImports, waitForImportQueue } from './services/import-queue.js';

const app = createApp();
let server;
let isShuttingDown = false;

async function start() {
  if (env.DB_MIGRATE_ON_START) {
    await migrateDatabase();
  }
  await sequelize.authenticate();
  await resumeIncompleteImports();

  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'HTTP server started');
  });
}

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, 'Shutting down HTTP server');

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await waitForImportQueue();
    await closeDatabase();
  } catch (error) {
    logger.error({ err: error }, 'Graceful shutdown failed');
    exitCode = 1;
  } finally {
    process.exitCode = exitCode;
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => {
  logger.fatal({ err: error }, 'Unhandled promise rejection');
  void shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  void shutdown('uncaughtException', 1);
});

start().catch((error) => {
  logger.fatal({ err: error }, 'Application startup failed');
  void shutdown('startupFailure', 1);
});
