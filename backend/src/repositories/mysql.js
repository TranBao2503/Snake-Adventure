import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { ApiError } from '../core/errors.js';

// MySQL adapters for the contract in docs/repositories.md.
// Schema: database/schema.sql (MySQL 8.0.19+).
//
// Time handling: the API uses ISO 8601 UTC strings; the database stores DATETIME(3) in UTC.
// The pool is created with dateStrings:true so the driver never applies a time zone itself.

const ER_DUP_ENTRY = 1062;
const ER_LOCK_DEADLOCK = 1213;
const SESSION_CLEANUP_INTERVAL_MS = 60_000;

// ---------- pool / health ----------

export function readMysqlConfig(env = process.env) {
  const port = Number(env.DB_PORT ?? 3306);
  const connectionLimit = Number(env.DB_POOL_SIZE ?? 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT must be an integer between 1 and 65535.');
  if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 100) {
    throw new Error('DB_POOL_SIZE must be an integer between 1 and 100.');
  }
  if (!env.DB_NAME) throw new Error('DB_NAME is required when STORAGE_DRIVER=mysql.');
  return {
    host: env.DB_HOST ?? '127.0.0.1',
    port,
    user: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME,
    connectionLimit,
  };
}

export function createMysqlPool(env = process.env) {
  const config = readMysqlConfig(env);
  return mysql.createPool({
    ...config,
    waitForConnections: true,
    charset: 'utf8mb4',
    dateStrings: true,          // DATETIME comes back as 'YYYY-MM-DD HH:MM:SS.mmm' (UTC)
    timezone: 'Z',
    supportBigNumbers: true,    // BIGINT beyond 2^53 comes back as string instead of losing precision
    bigNumberStrings: false,
  });
}

// Used by GET /health. Resolves true only if the database answers a trivial query.
export async function pingMysql(pool) {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// ---------- helpers ----------

const toSqlTime = (iso) => new Date(iso).toISOString().replace('T', ' ').replace('Z', '');
function toIso(value) {
  if (value instanceof Date) return value.toISOString();
  return `${String(value).replace(' ', 'T')}Z`;
}
const toNumber = (value) => Number(value);
const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value);
const isDuplicate = (error) => error?.errno === ER_DUP_ENTRY;

function userFromRow(row) {
  return row ? { id: row.id, username: row.username, passwordHash: row.password_hash, createdAt: toIso(row.created_at) } : null;
}

function recordFromRow(row) {
  return row
    ? { userId: row.user_id, mode: row.mode, score: toNumber(row.score), runId: row.run_id, achievedAt: toIso(row.achieved_at) }
    : null;
}

function levelFromRow(row) {
  return {
    levelId: row.level_id,
    activeDurationMs: toNumber(row.active_duration_ms),
    enteredPortal: true, // a stored level result is, by definition, a completed one
    preyCaught: parseJson(row.prey_caught),
    foodScore: toNumber(row.food_score),
    timeScore: toNumber(row.time_score),
    score: toNumber(row.score),
  };
}

function runFromRow(row, levelRows = []) {
  const run = {
    id: row.id,
    userId: row.user_id,
    runId: row.run_id,
    mode: row.mode,
    rulesVersion: row.rules_version,
    activeDurationMs: toNumber(row.active_duration_ms),
    endReason: row.end_reason,
    score: toNumber(row.score),
    scoreBreakdown: { foodScore: toNumber(row.food_score), timeScore: toNumber(row.time_score) },
    levelResults: levelRows.map(levelFromRow),
    fingerprint: row.fingerprint,
    createdAt: toIso(row.created_at),
  };
  if (row.food_eaten !== null) run.foodEaten = toNumber(row.food_eaten); // Classic only
  return run;
}

const RUN_COLUMNS = `id, user_id, run_id, mode, rules_version, active_duration_ms, end_reason,
  food_eaten, score, food_score, time_score, fingerprint, created_at`;

async function loadLevels(executor, runIds) {
  if (runIds.length === 0) return new Map();
  const [rows] = await executor.query(
    `SELECT run_pk, level_id, active_duration_ms, prey_caught, food_score, time_score, score
       FROM run_level_results WHERE run_pk IN (?) ORDER BY run_pk, level_index`,
    [runIds],
  );
  const byRun = new Map();
  for (const row of rows) {
    if (!byRun.has(row.run_pk)) byRun.set(row.run_pk, []);
    byRun.get(row.run_pk).push(row);
  }
  return byRun;
}

// Concurrent upserts on the same personal record can occasionally deadlock. The whole
// transaction is safe to repeat, so retry a few times before giving up.
async function withDeadlockRetry(work, attempts = 3) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (error?.errno !== ER_LOCK_DEADLOCK || attempt >= attempts) throw error;
    }
  }
}

// ---------- factory ----------

export function createMysqlRepositories(pool) {
  let lastSessionCleanup = 0;

  const users = {
    async findByUsername(username) {
      // The column collation is case insensitive, so no LOWER() is needed.
      const [rows] = await pool.query(
        'SELECT id, username, password_hash, created_at FROM users WHERE username = ? LIMIT 1', [username],
      );
      return userFromRow(rows[0]);
    },
    async findById(id) {
      const [rows] = await pool.query(
        'SELECT id, username, password_hash, created_at FROM users WHERE id = ? LIMIT 1', [id],
      );
      return userFromRow(rows[0]);
    },
    async create({ username, passwordHash, createdAt }) {
      const id = randomUUID();
      try {
        await pool.query(
          'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
          [id, username, passwordHash, toSqlTime(createdAt)],
        );
      } catch (error) {
        // The UNIQUE index decides concurrent registrations, not an application-level check.
        if (isDuplicate(error)) throw new ApiError(409, 'USERNAME_TAKEN', 'Username is already registered.');
        throw error;
      }
      return { id, username, passwordHash, createdAt: toIso(toSqlTime(createdAt)) };
    },
  };

  const sessions = {
    async create({ tokenHash, userId, createdAt, expiresAt }) {
      // Throttled cleanup keeps the table small without a DELETE on every login.
      const nowMs = Date.now();
      if (nowMs - lastSessionCleanup >= SESSION_CLEANUP_INTERVAL_MS) {
        lastSessionCleanup = nowMs;
        await pool.query('DELETE FROM sessions WHERE expires_at <= ?', [toSqlTime(createdAt)]);
      }
      await pool.query(
        'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
        [tokenHash, userId, toSqlTime(createdAt), toSqlTime(expiresAt)],
      );
    },
    async findActive(tokenHash, now) {
      const [rows] = await pool.query(
        'SELECT token_hash, user_id, created_at, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1',
        [tokenHash, toSqlTime(now)],
      );
      const row = rows[0];
      return row
        ? { tokenHash: row.token_hash, userId: row.user_id, createdAt: toIso(row.created_at), expiresAt: toIso(row.expires_at) }
        : null;
    },
    async delete(tokenHash) {
      await pool.query('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
    },
  };

  async function currentBest(executor, userId, mode) {
    const [rows] = await executor.query(
      'SELECT score, run_id FROM personal_records WHERE user_id = ? AND mode = ?', [userId, mode],
    );
    return rows[0] ?? null;
  }

  // A run with this (userId, runId) already exists: replay it or report a conflict.
  async function resolveExisting(submission) {
    const [rows] = await pool.query(
      `SELECT ${RUN_COLUMNS} FROM score_runs WHERE user_id = ? AND run_id = ?`, [submission.userId, submission.runId],
    );
    if (!rows[0]) throw new Error('Duplicate key reported but the existing run could not be read.');
    if (rows[0].fingerprint !== submission.fingerprint) {
      throw new ApiError(409, 'RUN_ID_CONFLICT', 'This runId was already saved with different results.');
    }
    const levels = await loadLevels(pool, [rows[0].id]);
    const best = await currentBest(pool, submission.userId, rows[0].mode);
    return {
      run: runFromRow(rows[0], levels.get(rows[0].id)),
      duplicate: true,
      isNewRecord: false,
      personalBest: toNumber(best.score),
    };
  }

  async function insertOnce(submission) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const id = randomUUID();
      try {
        await connection.query(
          `INSERT INTO score_runs (${RUN_COLUMNS})
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, submission.userId, submission.runId, submission.mode, submission.rulesVersion,
            submission.activeDurationMs, submission.endReason, submission.foodEaten ?? null,
            submission.score, submission.scoreBreakdown.foodScore, submission.scoreBreakdown.timeScore,
            submission.fingerprint, toSqlTime(submission.createdAt),
          ],
        );
      } catch (error) {
        if (isDuplicate(error)) {
          await connection.rollback();
          return { duplicateKey: true };
        }
        throw error;
      }

      for (const [index, level] of submission.levelResults.entries()) {
        await connection.query(
          `INSERT INTO run_level_results
             (run_pk, level_index, level_id, active_duration_ms, prey_caught, food_score, time_score, score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, index, level.levelId, level.activeDurationMs, JSON.stringify(level.preyCaught),
            level.foodScore, level.timeScore, level.score,
          ],
        );
      }

      // Replace the record only when no record exists or the new score is strictly greater.
      // The helper columns are assigned before `score` so they still see the old score.
      await connection.query(
        `INSERT INTO personal_records (user_id, mode, score, run_id, achieved_at)
         VALUES (?, ?, ?, ?, ?) AS new
         ON DUPLICATE KEY UPDATE
           run_id      = IF(new.score > personal_records.score, new.run_id,      personal_records.run_id),
           achieved_at = IF(new.score > personal_records.score, new.achieved_at, personal_records.achieved_at),
           score       = IF(new.score > personal_records.score, new.score,       personal_records.score)`,
        [submission.userId, submission.mode, submission.score, submission.runId, toSqlTime(submission.createdAt)],
      );
      // Not based on affectedRows: mysql2 enables FOUND_ROWS by default, which hides "unchanged".
      const best = await currentBest(connection, submission.userId, submission.mode);
      await connection.commit();
      return {
        duplicateKey: false,
        result: {
          run: structuredClone({ ...submission, id }),
          duplicate: false,
          isNewRecord: best.run_id === submission.runId,
          personalBest: toNumber(best.score),
        },
      };
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  }

  const scores = {
    async saveAndUpdateRecord(submission) {
      const outcome = await withDeadlockRetry(() => insertOnce(submission));
      return outcome.duplicateKey ? resolveExisting(submission) : outcome.result;
    },

    async listRecords(userId) {
      const [rows] = await pool.query(
        'SELECT user_id, mode, score, run_id, achieved_at FROM personal_records WHERE user_id = ?', [userId],
      );
      const byMode = Object.fromEntries(rows.map((row) => [row.mode, recordFromRow(row)]));
      return { classic: byMode.classic ?? null, hunt: byMode.hunt ?? null };
    },

    async listRuns({ userId, mode, page, pageSize }) {
      const where = mode ? 'user_id = ? AND mode = ?' : 'user_id = ?';
      const params = mode ? [userId, mode] : [userId];
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM score_runs WHERE ${where}`, params);
      const [rows] = await pool.query(
        `SELECT ${RUN_COLUMNS} FROM score_runs WHERE ${where}
          ORDER BY created_at DESC, id ASC LIMIT ? OFFSET ?`,
        [...params, pageSize, (page - 1) * pageSize],
      );
      const levels = await loadLevels(pool, rows.map((row) => row.id));
      return { items: rows.map((row) => runFromRow(row, levels.get(row.id))), total: toNumber(total) };
    },

    async leaderboard({ mode, limit }) {
      const [rows] = await pool.query(
        `SELECT u.username, r.score, r.achieved_at
           FROM personal_records r JOIN users u ON u.id = r.user_id
          WHERE r.mode = ?
          ORDER BY r.score DESC, r.achieved_at ASC, r.user_id ASC
          LIMIT ?`,
        [mode, limit],
      );
      return rows.map((row, index) => ({
        rank: index + 1, username: row.username, score: toNumber(row.score), achievedAt: toIso(row.achieved_at),
      }));
    },
  };

  return { users, sessions, scores };
}
