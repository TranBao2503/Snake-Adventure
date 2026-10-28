import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { harness, signIn, configuredRules } from './helpers.js';
import { gameRules } from '../src/config/game-rules.js';

test('health reports memory storage and configuration enables Hunt while leaving Classic undecided', async (t) => {
  const api = await harness(t);
  const health = await api.request('/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body.data, { status: 'ok', storage: 'memory', databaseConnected: false });
  const config = (await api.request('/game-config')).body.data;
  assert.equal(config.classic.pointsPerFood, null);
  assert.equal(config.hunt.snakeLengthPolicy, 'fixed');
  assert.equal(config.hunt.timeGraceSeconds, 60);
  assert.equal(config.hunt.timeScoreFloor, 0);
  assert.equal(config.hunt.levels.length, 2);
  assert.deepEqual(config.hunt.levels[0].preyCounts, { mouse: 20 });
  assert.deepEqual(config.hunt.levels[1].preyCounts, { mouse: 5, frog: 15 });
  assert.deepEqual(config.scoringConfigured, { classic: false, hunt: true });
});

test('registration, session authentication, and logout work without exposing password hashes', async (t) => {
  const api = await harness(t);
  const { cookie, user } = await signIn(api);
  assert.deepEqual(Object.keys(user).sort(), ['createdAt', 'id', 'username']);
  const profile = await api.request('/auth/me', { cookie });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.data.user.id, user.id);
  assert.equal((await api.request('/auth/me')).status, 401);
  const logout = await api.request('/auth/logout', { method: 'POST', body: {}, cookie });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  assert.equal((await api.request('/auth/me', { cookie })).status, 401);
});

test('login uses an HttpOnly cookie and rotates the existing session', async (t) => {
  const api = await harness(t);
  const { cookie } = await signIn(api);
  const login = await api.request('/auth/login', {
    method: 'POST', cookie, body: { username: 'player_one', password: 'snake-test-pass' },
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie'), /HttpOnly/);
  assert.match(login.headers.get('set-cookie'), /SameSite=Lax/);
  assert.match(login.headers.get('set-cookie'), /Path=\/api\/v1/);
  const rotated = login.headers.get('set-cookie').split(';')[0];
  assert.notEqual(rotated, cookie);
  assert.equal((await api.request('/auth/me', { cookie })).status, 401);
  assert.equal((await api.request('/auth/me', { cookie: rotated })).status, 200);
});

test('duplicate usernames are case insensitive and password confirmation is required', async (t) => {
  const api = await harness(t);
  await signIn(api);
  const duplicate = await api.request('/auth/register', {
    method: 'POST', body: { username: 'PLAYER_ONE', password: 'other-password', confirmPassword: 'other-password' },
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'USERNAME_TAKEN');
  const mismatch = await api.request('/auth/register', {
    method: 'POST', body: { username: 'Second_Player', password: 'other-password', confirmPassword: 'different' },
  });
  assert.equal(mismatch.status, 400);
  assert.equal(mismatch.body.error.details[0].field, 'confirmPassword');
});

test('wrong passwords and missing users return the same error', async (t) => {
  const api = await harness(t);
  await signIn(api);
  for (const username of ['Player_One', 'Missing_Player']) {
    const response = await api.request('/auth/login', { method: 'POST', body: { username, password: 'wrong-password' } });
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
  }
});

test('expired sessions cannot read personal information', async (t) => {
  let timestamp = new Date('2026-10-05T00:00:00.000Z');
  const api = await harness(t, { config: { sessionTtlSeconds: 60 }, now: () => timestamp });
  const { cookie } = await signIn(api);
  timestamp = new Date(timestamp.getTime() + 60000);
  assert.equal((await api.request('/me/records', { cookie })).status, 401);
});

test('allowed origins receive credentialed CORS and untrusted origins cannot write', async (t) => {
  const api = await harness(t);
  const preflight = await api.request('/scores', { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
  const blocked = await api.request('/auth/register', { method: 'POST', body: {}, origin: 'https://untrusted.example' });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.error.code, 'ORIGIN_NOT_ALLOWED');
  const form = await api.request('/auth/login', {
    method: 'POST', body: 'username=player', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  assert.equal(form.status, 415);
});

test('malformed cookies and JSON return structured errors instead of crashing', async (t) => {
  const api = await harness(t);
  assert.equal((await api.request('/auth/me', { cookie: 'snake_session=%ZZ' })).status, 401);
  const response = await api.request('/auth/login', { method: 'POST', body: '{broken' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_JSON');
  assert.equal(response.body.error.requestId, response.headers.get('x-request-id'));
  const oversized = await api.request('/auth/login', { method: 'POST', body: { value: 'x'.repeat(70000) } });
  assert.equal(oversized.status, 413);
  assert.equal(oversized.body.error.code, 'PAYLOAD_TOO_LARGE');
});

test('authentication attempts are rate limited and recover after the window', async (t) => {
  let timestamp = new Date('2026-10-05T00:00:00.000Z');
  const api = await harness(t, { config: { authRateLimitMax: 1, authRateLimitWindowSeconds: 10 }, now: () => timestamp });
  const options = { method: 'POST', body: {} };
  assert.equal((await api.request('/auth/login', options)).status, 400);
  const limited = await api.request('/auth/login', options);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '10');
  timestamp = new Date(timestamp.getTime() + 10000);
  assert.equal((await api.request('/auth/login', options)).status, 400);
});

test('guest leaderboards are readable and personal endpoints require authentication', async (t) => {
  const api = await harness(t);
  assert.deepEqual((await api.request('/leaderboard?mode=hunt')).body.data, { mode: 'hunt', items: [] });
  assert.equal((await api.request('/leaderboard')).status, 400);
  assert.equal((await api.request('/leaderboard?mode=classic&limit=101')).status, 400);
  assert.equal((await api.request('/leaderboard?mode=classic&mode=hunt')).status, 400);
  assert.equal((await api.request('/scores', { method: 'POST', body: {} })).status, 401);
  assert.equal((await api.request('/me/scores')).status, 401);
  assert.equal((await api.request('/unknown')).status, 404);
});

test('default rules reject Classic scores while its coefficient remains undecided', async (t) => {
  const api = await harness(t);
  const { cookie } = await signIn(api);
  const response = await api.request('/scores', {
    method: 'POST', cookie,
    body: { runId: randomUUID(), mode: 'classic', rulesVersion: gameRules.version, activeDurationMs: 1000, endReason: 'collision', foodEaten: 1 },
  });
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'SCORING_NOT_CONFIGURED');
  assert.deepEqual((await api.request('/me/records', { cookie })).body.data, { classic: null, hunt: null });
});

test('saving is idempotent, records never decrease, and history belongs to the signed-in user', async (t) => {
  const api = await harness(t, { rules: configuredRules() });
  const first = await signIn(api);
  const body = { runId: randomUUID(), mode: 'classic', rulesVersion: 'test-v1', activeDurationMs: 1000, endReason: 'collision', foodEaten: 3 };
  const saved = await api.request('/scores', { method: 'POST', cookie: first.cookie, body });
  assert.equal(saved.status, 201);
  assert.equal(saved.body.data.run.score, 30);
  assert.equal(saved.body.data.isNewRecord, true);
  assert.equal('userId' in saved.body.data.run, false);
  assert.equal('fingerprint' in saved.body.data.run, false);
  const retry = await api.request('/scores', { method: 'POST', cookie: first.cookie, body });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.data.duplicate, true);
  assert.equal(retry.body.data.run.id, saved.body.data.run.id);
  const conflict = await api.request('/scores', { method: 'POST', cookie: first.cookie, body: { ...body, foodEaten: 4 } });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, 'RUN_ID_CONFLICT');
  const lower = await api.request('/scores', { method: 'POST', cookie: first.cookie, body: { ...body, runId: randomUUID(), foodEaten: 1 } });
  assert.equal(lower.body.data.isNewRecord, false);
  assert.equal(lower.body.data.personalBest, 30);
  const history = await api.request('/me/scores?mode=classic&pageSize=1', { cookie: first.cookie });
  assert.equal(history.body.data.items.length, 1);
  assert.equal(history.body.data.pagination.total, 2);
  assert.equal(history.body.data.pagination.totalPages, 2);
  const second = await signIn(api, 'Second_Player');
  assert.equal((await api.request('/me/scores', { cookie: second.cookie })).body.data.pagination.total, 0);
  const records = (await api.request('/me/records', { cookie: first.cookie })).body.data;
  assert.equal(records.classic.score, 30);
  assert.equal(records.hunt, null);
  const leaderboard = (await api.request('/leaderboard?mode=classic')).body.data.items;
  assert.equal(leaderboard.length, 1);
  assert.equal(leaderboard[0].username, 'Player_One');
});

test('concurrent retries insert only one run and leaderboard ties favor the earlier record', async (t) => {
  let timestamp = new Date('2026-10-05T00:00:00.000Z');
  const api = await harness(t, { rules: configuredRules(), now: () => timestamp });
  const first = await signIn(api);
  const body = { runId: randomUUID(), mode: 'classic', rulesVersion: 'test-v1', activeDurationMs: 1000, endReason: 'collision', foodEaten: 3 };
  const requests = await Promise.all(Array.from({ length: 3 }, () => api.request('/scores', { method: 'POST', cookie: first.cookie, body })));
  assert.deepEqual(requests.map((response) => response.status).sort(), [200, 200, 201]);
  const second = await signIn(api, 'Second_Player');
  timestamp = new Date(timestamp.getTime() + 1000);
  await api.request('/scores', { method: 'POST', cookie: second.cookie, body: { ...body, runId: randomUUID() } });
  const leaderboard = (await api.request('/leaderboard?mode=classic')).body.data.items;
  assert.deepEqual(leaderboard.map((item) => item.username), ['Player_One', 'Second_Player']);
  assert.deepEqual(leaderboard.map((item) => item.rank), [1, 2]);
});

test('Hunt results preserve the food/time breakdown and reject submitted score fields', async (t) => {
  const api = await harness(t, { rules: configuredRules() });
  const { cookie } = await signIn(api);
  const body = {
    runId: randomUUID(), mode: 'hunt', rulesVersion: 'test-v1', activeDurationMs: 90000, endReason: 'collision',
    levelResults: [{ levelId: 'level-1', activeDurationMs: 75000, enteredPortal: true, preyCaught: { mouse: 2, bird: 8 } }],
  };
  const saved = await api.request('/scores', { method: 'POST', cookie, body });
  assert.equal(saved.status, 201);
  assert.equal(saved.body.data.run.score, 405);
  assert.deepEqual(saved.body.data.run.scoreBreakdown, { foodScore: 180, timeScore: 225 });
  assert.equal((await api.request('/leaderboard?mode=hunt')).body.data.items[0].score, 405);
  const forged = await api.request('/scores', { method: 'POST', cookie, body: { ...body, runId: randomUUID(), score: 99999 } });
  assert.equal(forged.status, 400);
});
