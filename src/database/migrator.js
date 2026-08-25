import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { SequelizeStorage, Umzug } from 'umzug';

const databaseDirectory = path.dirname(fileURLToPath(import.meta.url));

function createUmzug({ sequelize, directory, tableName }) {
  return new Umzug({
    migrations: {
      glob: path.join(databaseDirectory, directory, '*.js'),
      resolve: ({ name, path: migrationPath, context }) => ({
        name,
        up: async () => {
          const migration = await import(pathToFileURL(migrationPath).href);
          return migration.up({ context });
        },
        down: async () => {
          const migration = await import(pathToFileURL(migrationPath).href);
          return migration.down({ context });
        },
      }),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({
      sequelize,
      modelName: tableName,
      tableName,
    }),
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
