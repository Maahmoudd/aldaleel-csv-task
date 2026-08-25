import { logger } from '../config/logger.js';
import { sequelize } from './index.js';
import { createMigrator, createSeeder } from './migrator.js';

const command = process.argv[2];
const commands = {
  migrate: () => createMigrator(sequelize).up(),
  'migrate:undo': () => createMigrator(sequelize).down(),
  seed: async () => {
    await createMigrator(sequelize).up();
    return createSeeder(sequelize).up();
  },
  'seed:undo': () => createSeeder(sequelize).down(),
};

if (!commands[command]) {
  logger.error({ command }, 'Unknown database command');
  process.exitCode = 1;
} else {
  try {
    const executed = await commands[command]();
    logger.info(
      { files: executed.map(({ name }) => name) },
      `Database command "${command}" completed`,
    );
  } catch (error) {
    logger.error({ err: error, command }, 'Database command failed');
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
