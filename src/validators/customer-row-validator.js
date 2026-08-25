import { z } from 'zod';

const customerRowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(254, 'Email must not exceed 254 characters')
    .email('Email must be a valid email address')
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone is required')
    .transform((value) => value.replace(/[\s().-]/g, ''))
    .refine((value) => /^\+?[1-9]\d{7,14}$/.test(value), {
      message: 'Phone must contain 8 to 15 digits and may start with +',
    }),
});

export function validateCustomerRow(row) {
  const result = customerRowSchema.safeParse(row);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? 'row'),
      reason: issue.message,
    })),
  };
}

export { customerRowSchema };
