import { logger } from '../config/logger.js';
import { initializeModels } from '../models/index.js';
import { createSequelize } from './connection.js';
import { createMigrator, createSeeder } from './migrator.js';

export const sequelize = createSequelize();
export const models = initializeModels(sequelize);

export async function migrateDatabase() {
  const migrations = await createMigrator(sequelize).up();
  if (migrations.length > 0) {
    logger.info({ migrations: migrations.map(({ name }) => name) }, 'Database migrations applied');
  }
}

export async function closeDatabase() {
  await sequelize.close();
}

export { createMigrator, createSeeder, createSequelize, initializeModels };
