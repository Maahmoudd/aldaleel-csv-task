import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('imports', 'storage_key', {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await queryInterface.addIndex('imports', ['storage_key'], {
    unique: true,
    name: 'imports_storage_key_unique',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('imports', 'imports_storage_key_unique');
  await queryInterface.removeColumn('imports', 'storage_key');
}
