import { validateCustomerRow } from '../../src/validators/customer-row-validator.js';

describe('validateCustomerRow', () => {
  it('normalizes a valid customer row', () => {
    const result = validateCustomerRow({
      name: '  Ada Lovelace  ',
      email: '  ADA@EXAMPLE.COM ',
      phone: '+1 (202) 555-0123',
    });

    expect(result).toEqual({
      success: true,
      data: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+12025550123',
      },
    });
  });

  it.each([
    [{ email: 'person@example.com', phone: '+12025550123' }, 'name'],
    [{ name: 'Person', phone: '+12025550123' }, 'email'],
    [{ name: 'Person', email: 'person@example.com' }, 'phone'],
  ])('rejects a missing required field', (row, expectedField) => {
    const result = validateCustomerRow(row);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: expectedField })]),
    );
  });

  it('rejects an invalid email address', () => {
    const result = validateCustomerRow({
      name: 'Person',
      email: 'not-an-email',
      phone: '+12025550123',
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'email',
      reason: 'Email must be a valid email address',
    });
  });

  it.each(['123', '+0123456789', 'phone-number', '+1234567890123456'])(
    'rejects invalid phone value %s',
    (phone) => {
      const result = validateCustomerRow({
        name: 'Person',
        email: 'person@example.com',
        phone,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'phone' })]),
      );
    },
  );
});
