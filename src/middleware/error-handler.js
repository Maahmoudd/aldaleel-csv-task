import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export function errorHandler(error, request, response, _next) {
  const statusCode = error.statusCode ?? error.status ?? 500;
  const isServerError = statusCode >= 500;

  request.log?.[isServerError ? 'error' : 'warn']({ err: error }, error.message);
  if (!request.log) {
    logger[isServerError ? 'error' : 'warn']({ err: error }, error.message);
  }

  const payload = {
    error: {
      code: error.code ?? (isServerError ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message: isServerError ? 'An unexpected error occurred' : error.message,
    },
  };

  if (env.NODE_ENV !== 'production' && isServerError) {
    payload.error.stack = error.stack;
  }

  response.status(statusCode).json(payload);
}
