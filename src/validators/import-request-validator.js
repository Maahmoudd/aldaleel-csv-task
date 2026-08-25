import { z } from 'zod';

export const importIdParamsSchema = z.object({
  id: z.uuid('Import ID must be a valid UUID'),
});

export const importListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
