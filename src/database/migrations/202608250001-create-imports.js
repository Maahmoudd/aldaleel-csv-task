import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('imports', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'completed_with_errors', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    total_records: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    processed_records: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    successful_records: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failed_records: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    error_report: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    uploaded_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('imports', ['status']);
  await queryInterface.addIndex('imports', ['uploaded_at']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('imports');
}
