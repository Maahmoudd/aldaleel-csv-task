import express from 'express';
import pinoHttp from 'pino-http';

import { logger } from './config/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { healthRouter } from './routes/health-routes.js';
import { importRouter } from './routes/import-routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.use('/health', healthRouter);
  app.use('/api/imports', importRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
