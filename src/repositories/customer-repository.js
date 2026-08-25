import { Op } from 'sequelize';

import { models } from '../database/index.js';

export async function deleteCustomersForImport(importId) {
  return models.Customer.destroy({ where: { importId } });
}

export async function findExistingEmails(emails) {
  if (emails.length === 0) return new Set();

  const customers = await models.Customer.findAll({
    attributes: ['email'],
    where: { email: { [Op.in]: emails } },
    raw: true,
  });

  return new Set(customers.map(({ email }) => email.toLowerCase()));
}

export async function insertCustomers(customers) {
  if (customers.length === 0) return [];
  return models.Customer.bulkCreate(customers, { validate: true });
}
