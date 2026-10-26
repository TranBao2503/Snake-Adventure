import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { harness, signIn, configuredRules } from './helpers.js';
import { createMysqlPool, createMysqlRepositories, pingMysql } from '../src/repositories/mysql.js';

// These tests run against a REAL MySQL database and DELETE ALL ROWS first.
// They only run when DB_NAME ends with "_test", so they can never touch your real data:
//   DB_NAME=snake_adventure_test DB_USER=... DB_PASSWORD=... node --test test/mysql.test.js
const enabled = Boolean(process.env.DB_NAME?.endsWith('_test'));
const options = { skip: enabled ? false : 'Set DB_NAME=<something>_test to run the MySQL tests.' };

const pool = enabled ? createMysqlPool() : null;
test.after(async () => { await pool?.end(); });

async function mysqlHarness(t, overrides = {}) {
  await pool.query('DELETE FROM users'); // cascades to sessions, runs, level results and records
  const repositories = createMysqlRepositories(pool);
  const api = await harness(t, {
    rules: configuredRules(), repositories, storage: { name: 'mysql', check: () => pingMysql(pool) }, ...overrides,
  });
  return { api, repositories };
}

const classicBody = (overrides = {}) => ({
  runId: randomUUID(), mode: 'classic', rulesVersion: 'test-v1', activeDurationMs: 1000,
  endReason: 'collision', foodEaten: 3, ...overrides,
});

test('health reports the real MySQL connection', options, async (t) => {
  const { api } = await mysqlHarness(t);
  const health = await api.request('/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body.data, { status: 'ok', storage: 'mysql', databaseConnected: true });
});

test('usernames are unique ignoring case, even under concurrent registration', options, async (t) => {
  const { api } = await mysqlHarness(t);
  const body = (username) => ({ username, password: 'snake-test-pass', confirmPassword: 'snake-test-pass' });
  const results = await Promise.all(['Alice_01', 'alice_01', 'ALICE_01'].map(
    (username) => api.request('/auth/register', { method: 'POST', body: body(username) }),
  ));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409]);
  const login = await api.request('/auth/login', { method: 'POST', body: { username: 'ALICE_01', password: 'snake-test-pass' } });
  assert.equal(login.status, 200);
  assert.match(login.body.data.user.username, /^alice_01$/i);
});

test('sessions: only the hash is stored, expiry is exclusive, logout deletes', options, async (t) => {
  const { repositories } = await mysqlHarness(t);
  const user = await repositories.users.create({ username: 'Sess_User', passwordHash: 'scrypt$a$b', createdAt: '2026-10-01T00:00:00.000Z' });
  const tokenHash = createHash('sha256').update('raw-token').digest('hex');
  await repositories.sessions.create({
    tokenHash, userId: user.id, createdAt: '2026-10-01T00:00:00.000Z', expiresAt: '2026-10-01T01:00:00.000Z',
  });
  const active = await repositories.sessions.findActive(tokenHash, '2026-10-01T00:59:59.999Z');
  assert.equal(active.userId, user.id);
  assert.equal(active.expiresAt, '2026-10-01T01:00:00.000Z');
  assert.equal(await repositories.sessions.findActive(tokenHash, '2026-10-01T01:00:00.000Z'), null);
  await repositories.sessions.delete(tokenHash);
  await repositories.sessions.delete(tokenHash); // missing session is harmless
  assert.equal(await repositories.sessions.findActive(tokenHash, '2026-10-01T00:30:00.000Z'), null);
});

test('saving is idempotent, records never decrease, history belongs to the user', options, async (t) => {
  const { api } = await mysqlHarness(t);
  const first = await signIn(api);
  const body = classicBody();
  const saved = await api.request('/scores', { method: 'POST', cookie: first.cookie, body });
  assert.equal(saved.status, 201);
  assert.equal(saved.body.data.run.score, 30);
  assert.equal(saved.body.data.isNewRecord, true);
  const retry = await api.request('/scores', { method: 'POST', cookie: first.cookie, body });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.data.duplicate, true);
  assert.equal(retry.body.data.run.id, saved.body.data.run.id);
  const conflict = await api.request('/scores', { method: 'POST', cookie: first.cookie, body: { ...body, foodEaten: 4 } });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, 'RUN_ID_CONFLICT');
  const lower = await api.request('/scores', { method: 'POST', cookie: first.cookie, body: classicBody({ foodEaten: 1 }) });
  assert.equal(lower.body.data.isNewRecord, false);
  assert.equal(lower.body.data.personalBest, 30);
  const equal = await api.request('/scores', { method: 'POST', cookie: first.cookie, body: classicBody({ foodEaten: 3 }) });
  assert.equal(equal.body.data.isNewRecord, false, 'an equal score must keep the earlier record');
  const history = await api.request('/me/scores?mode=classic&pageSize=1', { cookie: first.cookie });
  assert.equal(history.body.data.items.length, 1);
  assert.equal(history.body.data.pagination.total, 3);
  const second = await signIn(api, 'Second_Player');
  assert.equal((await api.request('/me/scores', { cookie: second.cookie })).body.data.pagination.total, 0);
  const records = (await api.request('/me/records', { cookie: first.cookie })).body.data;
  assert.equal(records.classic.score, 30);
  assert.equal(records.classic.runId, body.runId);
  assert.equal(records.hunt, null);
});

test('concurrent retries insert one run; leaderboard ties favor the earlier record', options, async (t) => {
  let timestamp = new Date('2026-10-05T00:00:00.000Z');
  const { api } = await mysqlHarness(t, { now: () => timestamp });
  const first = await signIn(api);
  const body = classicBody();
  const requests = await Promise.all(Array.from({ length: 5 }, () => api.request('/scores', { method: 'POST', cookie: first.cookie, body })));
  assert.deepEqual(requests.map((r) => r.status).sort(), [200, 200, 200, 200, 201]);
  const [{ n }] = (await pool.query('SELECT COUNT(*) AS n FROM score_runs'))[0];
  assert.equal(Number(n), 1, 'exactly one row must be stored');
  const second = await signIn(api, 'Second_Player');
  timestamp = new Date(timestamp.getTime() + 1000);
  await api.request('/scores', { method: 'POST', cookie: second.cookie, body: classicBody() });
  const leaderboard = (await api.request('/leaderboard?mode=classic')).body.data.items;
  assert.deepEqual(leaderboard.map((item) => item.username), ['Player_One', 'Second_Player']);
  assert.deepEqual(leaderboard.map((item) => item.rank), [1, 2]);
});

test('concurrent different runs of one player keep the highest score', options, async (t) => {
  const { api } = await mysqlHarness(t);
  const { cookie } = await signIn(api);
  const foods = [1, 7, 3, 9, 5, 2, 8, 4];
  const responses = await Promise.all(foods.map(
    (foodEaten) => api.request('/scores', { method: 'POST', cookie, body: classicBody({ foodEaten }) }),
  ));
  assert.ok(responses.every((r) => r.status === 201), 'no request may fail on a lock conflict');
  const records = (await api.request('/me/records', { cookie })).body.data;
  assert.equal(records.classic.score, 90);
});

test('Hunt keeps its per-level breakdown and survives an app restart', options, async (t) => {
  const { api } = await mysqlHarness(t);
  const { cookie } = await signIn(api);
  const body = {
    runId: randomUUID(), mode: 'hunt', rulesVersion: 'test-v1', activeDurationMs: 90000, endReason: 'collision',
    levelResults: [{ levelId: 'level-1', activeDurationMs: 75000, enteredPortal: true, preyCaught: { mouse: 2, bird: 8 } }],
  };
  const saved = await api.request('/scores', { method: 'POST', cookie, body });
  assert.equal(saved.status, 201);
  assert.equal(saved.body.data.run.score, 405);
  assert.deepEqual(saved.body.data.run.scoreBreakdown, { foodScore: 180, timeScore: 225 });

  // A second app instance on the same database stands in for a server restart.
  const restarted = await harness(t, {
    rules: configuredRules(), repositories: createMysqlRepositories(pool), storage: { name: 'mysql', check: () => pingMysql(pool) },
  });
  const history = (await restarted.request('/me/scores?mode=hunt', { cookie })).body.data.items;
  assert.equal(history.length, 1);
  assert.deepEqual(history[0].levelResults, saved.body.data.run.levelResults);
  assert.equal('foodEaten' in history[0], false);
  assert.equal((await restarted.request('/leaderboard?mode=hunt')).body.data.items[0].score, 405);
});

test('a failed record update leaves no partial run behind', options, async (t) => {
  const { repositories } = await mysqlHarness(t);
  const user = await repositories.users.create({ username: 'Atomic_User', passwordHash: 'scrypt$a$b', createdAt: '2026-10-01T00:00:00.000Z' });
  const submission = {
    userId: user.id, runId: randomUUID(), mode: 'classic', rulesVersion: 'test-v1', activeDurationMs: 1000,
    endReason: 'collision', foodEaten: 1, score: 10, scoreBreakdown: { foodScore: 10, timeScore: 0 },
    levelResults: [], fingerprint: 'f'.repeat(64), createdAt: '2026-10-01T00:00:00.000Z',
  };
  // Violates chk_runs_score_sum, so the INSERT must fail and nothing may be stored.
  await assert.rejects(repositories.scores.saveAndUpdateRecord({ ...submission, score: 999 }));
  const counts = await pool.query('SELECT (SELECT COUNT(*) FROM score_runs) AS runs, (SELECT COUNT(*) FROM personal_records) AS records');
  assert.deepEqual([Number(counts[0][0].runs), Number(counts[0][0].records)], [0, 0]);
});
