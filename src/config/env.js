import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),
  DATABASE_URL: z
    .url()
    .refine((value) => ['mysql:', 'mysql2:'].includes(new URL(value).protocol), {
      message: 'DATABASE_URL must use the mysql:// protocol',
    })
    .default('mysql://epic_user:epic_password@127.0.0.1:3306/epic_imports'),
  DB_MIGRATE_ON_START: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  DB_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DB_POOL_MIN: z.coerce.number().int().nonnegative().default(0),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_POOL_ACQUIRE_MS: z.coerce.number().int().positive().default(30000),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${z.prettifyError(parsedEnv.error)}`);
}

export const env = Object.freeze({
  ...parsedEnv.data,
  maxFileSizeBytes: Math.floor(parsedEnv.data.MAX_FILE_SIZE_MB * 1024 * 1024),
});
