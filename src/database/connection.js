import { Sequelize } from 'sequelize';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export function createSequelize(databaseUrl = env.DATABASE_URL) {
  return new Sequelize(databaseUrl, {
    dialect: 'mysql',
    dialectOptions: env.DB_SSL
      ? {
          ssl: { rejectUnauthorized: true },
        }
      : undefined,
    logging: (message) => logger.debug({ sql: message }, 'Database query'),
    pool: {
      acquire: env.DB_POOL_ACQUIRE_MS,
      max: env.DB_POOL_MAX,
      min: env.DB_POOL_MIN,
    },
    timezone: '+00:00',
    define: {
      freezeTableName: true,
      underscored: true,
    },
  });
}
