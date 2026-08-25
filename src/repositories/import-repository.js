import { Op } from 'sequelize';

import { models } from '../database/index.js';

export async function createImport({ filename, storageKey }) {
  return models.Import.create({
    filename,
    storageKey,
    status: 'pending',
    errorReport: [],
  });
}

export async function findImportById(id) {
  return models.Import.findByPk(id);
}

export async function findImports({ limit, offset }) {
  return models.Import.findAndCountAll({
    attributes: { exclude: ['storageKey'] },
    limit,
    offset,
    order: [
      ['uploadedAt', 'DESC'],
      ['id', 'DESC'],
    ],
  });
}

export async function findIncompleteImports() {
  return models.Import.findAll({
    attributes: ['id'],
    where: {
      status: { [Op.in]: ['pending', 'processing'] },
    },
    order: [['uploadedAt', 'ASC']],
  });
}

export async function updateImport(importJob, values) {
  return importJob.update(values);
}
