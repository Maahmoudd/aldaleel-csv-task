import { Customer, initializeCustomerModel } from './customer.js';
import { Import, initializeImportModel } from './import.js';

export function initializeModels(sequelize) {
  initializeImportModel(sequelize);
  initializeCustomerModel(sequelize);

  Import.hasMany(Customer, {
    as: 'customers',
    foreignKey: 'importId',
  });
  Customer.belongsTo(Import, {
    as: 'import',
    foreignKey: 'importId',
  });

  return { Customer, Import };
}

export { Customer, Import };
