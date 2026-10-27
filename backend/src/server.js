import { createApp } from './app.js';
import { readEnvironment } from './config/environment.js';
import { createMysqlPool, createMysqlRepositories, pingMysql } from './repositories/mysql.js';

const config = readEnvironment();
const driver = process.env.STORAGE_DRIVER ?? 'memory';
if (!['memory', 'mysql'].includes(driver)) {
  console.error('STORAGE_DRIVER must be memory or mysql.');
  process.exit(1);
}

let pool = null;
const appOptions = { config };
if (driver === 'mysql') {
  pool = createMysqlPool();
  // Fail fast with a clear message instead of failing on the first request.
  if (!(await pingMysql(pool))) {
    console.error('Unable to connect to MySQL. Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME.');
    await pool.end().catch(() => {});
    process.exit(1);
  }
  appOptions.repositories = createMysqlRepositories(pool);
  appOptions.storage = { name: 'mysql', check: () => pingMysql(pool) };
}

const app = createApp(appOptions);
const server = app.listen(config.port, config.host, () => {
  console.log(`Snake Adventure API: http://${config.host}:${config.port}/api/v1`);
  console.log(driver === 'mysql'
    ? `Storage: MySQL (${process.env.DB_NAME} @ ${process.env.DB_HOST ?? '127.0.0.1'}:${process.env.DB_PORT ?? 3306}).`
    : 'Storage: temporary memory. No database connection is configured.');
});

server.on('error', (error) => {
  console.error(`Unable to start the backend: ${error.message}`);
  process.exitCode = 1;
});

function shutdown() {
  server.close(async () => {
    await pool?.end().catch(() => {});
    process.exitCode = 0;
  });
  server.closeIdleConnections();
  const deadline = setTimeout(() => server.closeAllConnections(), 5000);
  deadline.unref();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
