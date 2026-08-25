import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),
  DATABASE_URL: z.string().min(1).default('./data/app.sqlite'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${z.prettifyError(parsedEnv.error)}`);
}

export const env = Object.freeze({
  ...parsedEnv.data,
  maxFileSizeBytes: Math.floor(parsedEnv.data.MAX_FILE_SIZE_MB * 1024 * 1024),
});
