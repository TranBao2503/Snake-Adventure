
import { createDatabasePool } from '../src/config/database.js';

const pool = createDatabasePool();

try {
  const [rows] = await pool.query(
    'SELECT 1 AS connected, DATABASE() AS database_name'
  );

  console.log('MySQL connection successful!');
  console.log('Database:', rows[0].database_name);
  console.log('Test result:', rows[0].connected);
} catch (error) {
  console.error('MySQL connection failed.');
  console.error('Error code:', error.code ?? 'UNKNOWN');
  console.error('Message:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
