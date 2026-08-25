import { AppError } from '../utils/app-error.js';

export function notFoundHandler(request, _response, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${request.method} ${request.originalUrl} not found`));
}
