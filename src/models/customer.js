import { DataTypes, Model } from 'sequelize';

export class Customer extends Model {}

export function initializeCustomerModel(sequelize) {
  Customer.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      importId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'import_id',
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
      createdAt: {
        type: DataTypes.DATE(6),
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE(6),
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      sequelize,
      modelName: 'Customer',
      tableName: 'customers',
      underscored: true,
    },
  );

  return Customer;
}
