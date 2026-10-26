
import mysql from 'mysql2/promise';

export function createDatabasePool(env = process.env) {
  const host = env.DB_HOST ?? '127.0.0.1';
  const port = Number(env.DB_PORT ?? 3306);
  const user = env.DB_USER ?? 'root';
  const password = env.DB_PASSWORD ?? '';
  const database = env.DB_NAME ?? 'snake_adventure';

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid port number.');
  }

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z',
  });
}
