import { AppError } from '../utils/app-error.js';

function validationDetails(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'request',
    reason: issue.message,
  }));
}

export function validateRequest(schemas) {
  return function requestValidationMiddleware(request, _response, next) {
    const validated = {};

    for (const [source, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(request[source]);
      if (!result.success) {
        next(
          new AppError(
            400,
            'VALIDATION_ERROR',
            `Invalid request ${source}`,
            validationDetails(result.error),
          ),
        );
        return;
      }
      validated[source] = result.data;
    }

    request.validated = validated;
    next();
  };
}
