import { rateLimit } from 'express-rate-limit';

import { env } from '../config/env.js';

export const uploadRateLimit = rateLimit({
  windowMs: env.UPLOAD_RATE_LIMIT_WINDOW_MS,
  limit: env.UPLOAD_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many import requests; please try again later',
      },
    });
  },
});
