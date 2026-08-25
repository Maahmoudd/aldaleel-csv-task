import pino from 'pino';

import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'epic-csv-data-import' },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
});
