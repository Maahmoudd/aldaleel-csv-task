import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('customers', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    import_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'imports',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
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

  await queryInterface.addIndex('customers', ['import_id']);
  await queryInterface.addIndex('customers', ['email'], {
    unique: true,
    name: 'customers_email_unique',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('customers');
}
