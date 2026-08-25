const importId = '10000000-0000-4000-8000-000000000001';
const customerId = '20000000-0000-4000-8000-000000000001';

export async function up({ context: queryInterface }) {
  const timestamp = new Date();

  await queryInterface.bulkInsert('imports', [
    {
      id: importId,
      filename: 'seed-customers.csv',
      status: 'completed',
      total_records: 1,
      processed_records: 1,
      successful_records: 1,
      failed_records: 0,
      error_report: JSON.stringify([]),
      uploaded_at: timestamp,
      started_at: timestamp,
      completed_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ]);

  await queryInterface.bulkInsert('customers', [
    {
      id: customerId,
      import_id: importId,
      name: 'Demo Customer',
      email: 'demo@example.com',
      phone: '+12025550123',
      created_at: timestamp,
      updated_at: timestamp,
    },
  ]);
}

export async function down({ context: queryInterface }) {
  await queryInterface.bulkDelete('customers', { id: customerId });
  await queryInterface.bulkDelete('imports', { id: importId });
}
