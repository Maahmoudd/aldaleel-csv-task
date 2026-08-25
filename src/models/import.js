import { DataTypes, Model } from 'sequelize';

export const IMPORT_STATUSES = Object.freeze([
  'pending',
  'processing',
  'completed',
  'completed_with_errors',
  'failed',
]);

export class Import extends Model {}

export function initializeImportModel(sequelize) {
  Import.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...IMPORT_STATUSES),
        allowNull: false,
        defaultValue: 'pending',
      },
      totalRecords: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'total_records',
      },
      processedRecords: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'processed_records',
      },
      successfulRecords: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'successful_records',
      },
      failedRecords: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'failed_records',
      },
      errorReport: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        field: 'error_report',
      },
      uploadedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'uploaded_at',
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'started_at',
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'completed_at',
      },
    },
    {
      sequelize,
      modelName: 'Import',
      tableName: 'imports',
      underscored: true,
    },
  );

  return Import;
}
