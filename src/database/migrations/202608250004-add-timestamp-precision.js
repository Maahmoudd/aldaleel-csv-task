import { DataTypes } from 'sequelize';

async function changeTimestampColumns(queryInterface, precision) {
  const dateType = precision === undefined ? DataTypes.DATE : DataTypes.DATE(precision);

  await queryInterface.changeColumn('imports', 'uploaded_at', {
    type: dateType,
    allowNull: false,
  });
  await queryInterface.changeColumn('imports', 'started_at', {
    type: dateType,
    allowNull: true,
  });
  await queryInterface.changeColumn('imports', 'completed_at', {
    type: dateType,
    allowNull: true,
  });
  await queryInterface.changeColumn('imports', 'created_at', {
    type: dateType,
    allowNull: false,
  });
  await queryInterface.changeColumn('imports', 'updated_at', {
    type: dateType,
    allowNull: false,
  });
  await queryInterface.changeColumn('customers', 'created_at', {
    type: dateType,
    allowNull: false,
  });
  await queryInterface.changeColumn('customers', 'updated_at', {
    type: dateType,
    allowNull: false,
  });
}

export async function up({ context: queryInterface }) {
  await changeTimestampColumns(queryInterface, 6);
}

export async function down({ context: queryInterface }) {
  await changeTimestampColumns(queryInterface);
}
