import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SequelizeStorage, Umzug } from 'umzug';

const databaseDirectory = path.dirname(fileURLToPath(import.meta.url));

function createUmzug({ sequelize, directory, tableName }) {
  return new Umzug({
    migrations: {
      glob: path.join(databaseDirectory, directory, '*.js'),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize, tableName }),
    logger: undefined,
  });
}

export function createMigrator(sequelize) {
  return createUmzug({
    sequelize,
    directory: 'migrations',
    tableName: 'sequelize_migrations',
  });
}

export function createSeeder(sequelize) {
  return createUmzug({
    sequelize,
    directory: 'seeders',
    tableName: 'sequelize_seeders',
  });
}
