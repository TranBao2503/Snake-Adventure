import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { harness, signIn, configuredRules } from './helpers.js';
import { gameRules } from '../src/config/game-rules.js';

async function chooseName(api, username, cookie) {
  const response = await api.request('/auth/player', { method: 'POST', body: { username }, cookie });
  return {
    ...response,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}

function classicRun(foodEaten = 3) {
  return {
    runId: randomUUID(), mode: 'classic', rulesVersion: 'test-v1',
    foodEaten, activeDurationMs: 30000, endReason: 'collision',
  };
}

test('a player can choose a Unicode name without providing a password', async (t) => {
  const api = await harness(t);
  const response = await chooseName(api, '  Bảo   Snake  ');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.user.username, 'Bảo Snake');
  assert.equal(response.body.data.canSaveScores, true);
  assert.deepEqual(Object.keys(response.body.data.user).sort(), ['createdAt', 'id', 'username']);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  const profile = await api.request('/auth/me', { cookie: response.cookie });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.data.user.id, response.body.data.user.id);
});

test('returning name-only players reuse their record without case or Unicode variants creating duplicates', async (t) => {
  const api = await harness(t);
  const first = await chooseName(api, 'Bảo Snake');
  const second = await chooseName(api, 'bảo snake'.normalize('NFD'));
  assert.equal(second.status, 200);
  assert.equal(first.body.data.user.id, second.body.data.user.id);
  assert.equal(second.body.data.user.username, 'Bảo Snake');
});

test('concurrent name selection creates one identity and valid independent sessions', async (t) => {
  const api = await harness(t);
  const responses = await Promise.all(Array.from({ length: 4 }, () => chooseName(api, 'Same Player')));
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(new Set(responses.map((response) => response.body.data.user.id)).size, 1);
  for (const response of responses) {
    assert.equal((await api.request('/auth/me', { cookie: response.cookie })).status, 200);
  }
});

test('invalid names and credential fields are rejected by the name-only endpoint', async (t) => {
  const api = await harness(t);
  for (const username of ['', ' ', 'a', '<script>alert(1)</script>', 'a'.repeat(31), 'A\nB', '_Player', 123]) {
    const response = await chooseName(api, username);
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  }
  const extra = await api.request('/auth/player', { method: 'POST', body: { username: 'Player', password: 'unexpected' } });
  assert.equal(extra.status, 400);
});

test('name-only play cannot bypass an existing password-protected account', async (t) => {
  const api = await harness(t);
  const protectedPlayer = await signIn(api, 'Protected_Player');
  const response = await chooseName(api, 'protected_player', protectedPlayer.cookie);
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'NAME_UNAVAILABLE');
  assert.equal((await api.request('/auth/me', { cookie: protectedPlayer.cookie })).status, 200);
});

test('the legacy password endpoint handles a name-only account as invalid credentials', async (t) => {
  const api = await harness(t);
  await chooseName(api, 'Named_Player');
  const response = await api.request('/auth/login', {
    method: 'POST', body: { username: 'Named_Player', password: 'not-a-password' },
  });
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
});

test('guest selection works without a named account and never creates a score identity', async (t) => {
  const api = await harness(t, { rules: configuredRules() });
  const guest = await api.request('/auth/guest', { method: 'POST', body: {} });
  assert.equal(guest.status, 200);
  assert.deepEqual(guest.body.data, { user: null, canSaveScores: false });
  assert.match(guest.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  const save = await api.request('/scores', { method: 'POST', body: classicRun() });
  assert.equal(save.status, 401);
  assert.deepEqual((await api.request('/leaderboard?mode=classic')).body.data.items, []);
});

test('switching to guest revokes the old session and blocks score writes with its retained cookie', async (t) => {
  const api = await harness(t, { rules: configuredRules() });
  const player = await chooseName(api, 'Former Player');
  const guest = await api.request('/auth/guest', { method: 'POST', body: {}, cookie: player.cookie });
  assert.equal(guest.status, 200);
  assert.equal((await api.request('/auth/me', { cookie: player.cookie })).status, 401);
  assert.equal((await api.request('/me/scores', { cookie: player.cookie })).status, 401);
  const save = await api.request('/scores', { method: 'POST', body: classicRun(), cookie: player.cookie });
  assert.equal(save.status, 401);
  assert.deepEqual((await api.request('/leaderboard?mode=classic')).body.data.items, []);
});

test('switching names rotates the session and preserves personal record ownership', async (t) => {
  const api = await harness(t, { rules: configuredRules() });
  const first = await chooseName(api, 'First Player');
  await api.request('/scores', { method: 'POST', body: classicRun(5), cookie: first.cookie });
  const second = await chooseName(api, 'Second Player', first.cookie);
  assert.equal((await api.request('/auth/me', { cookie: first.cookie })).status, 401);
  assert.deepEqual((await api.request('/me/records', { cookie: second.cookie })).body.data, { classic: null, hunt: null });
  const returned = await chooseName(api, 'first player', second.cookie);
  assert.equal((await api.request('/me/records', { cookie: returned.cookie })).body.data.classic.score, 50);
});

test('name-only players can save configured scores and receive their Top 10 qualification', async (t) => {
  const api = await harness(t, { rules: configuredRules() });
  for (let index = 1; index <= 10; index += 1) {
    const player = await chooseName(api, `Player ${index}`);
    const saved = await api.request('/scores', { method: 'POST', body: classicRun(index), cookie: player.cookie });
    assert.equal(saved.status, 201);
    assert.equal(saved.body.data.leaderboard.qualified, true);
  }
  const lowPlayer = await chooseName(api, 'Low Player');
  const low = await api.request('/scores', { method: 'POST', body: classicRun(0), cookie: lowPlayer.cookie });
  assert.deepEqual(low.body.data.leaderboard, { limit: 10, qualified: false, rank: null });
  assert.equal((await api.request('/leaderboard?mode=classic')).body.data.items.length, 10);

  const improved = await api.request('/scores', { method: 'POST', body: classicRun(20), cookie: lowPlayer.cookie });
  assert.deepEqual(improved.body.data.leaderboard, { limit: 10, qualified: true, rank: 1 });
  assert.equal((await api.request('/leaderboard?mode=classic')).body.data.items[0].username, 'Low Player');
});

test('name-only sessions still respect undecided scoring rules', async (t) => {
  const api = await harness(t);
  const player = await chooseName(api, 'No Coefficients');
  const body = { ...classicRun(), rulesVersion: gameRules.version };
  const response = await api.request('/scores', { method: 'POST', body, cookie: player.cookie });
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'SCORING_NOT_CONFIGURED');
});
