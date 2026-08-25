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
