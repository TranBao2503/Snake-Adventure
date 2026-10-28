import test from 'node:test';
import assert from 'node:assert/strict';
import './player-session.js';

const { PlayerSession } = globalThis.ClassicPlayer;
const reply = (data) => new Response(JSON.stringify({ data }), { status: 200 });

test('local-file guest play works without any network request', async () => {
  const calls = [];
  const session = new PlayerSession({ localFile: true, fetchImpl: (...args) => { calls.push(args); } });
  assert.equal(await session.restore(), null);
  await session.selectGuest();
  assert.deepEqual(await session.saveRun({}), { saved: false, reason: 'guest' });
  assert.deepEqual(calls, []);
  await assert.rejects(() => session.selectName('Player'), (error) => error.code === 'SERVER_REQUIRED');
});

test('named selection sends only a name with credentialed JSON requests', async () => {
  let request;
  const session = new PlayerSession({ fetchImpl: async (path, options) => {
    request = { path, options };
    return reply({ user: { id: 'player-1', username: 'Bảo Snake' } });
  } });
  await session.selectName('Bảo Snake');
  assert.equal(request.path, '/api/v1/auth/player');
  assert.equal(request.options.credentials, 'include');
  assert.deepEqual(JSON.parse(request.options.body), { username: 'Bảo Snake' });
  assert.equal(session.player.user.username, 'Bảo Snake');
});

test('switching to guest revokes the server session and suppresses every score request', async () => {
  const calls = [];
  const session = new PlayerSession({ fetchImpl: async (path) => {
    calls.push(path); return reply({ user: null, canSaveScores: false });
  } });
  session.player = { kind: 'named', user: { id: 'old-player' } };
  await session.selectGuest();
  const result = await session.saveRun({ playerId: 'old-player', mode: 'classic' });
  assert.equal(result.reason, 'guest');
  assert.deepEqual(calls, ['/api/v1/auth/guest']);
});

test('an old profile restore cannot override a newer guest selection', async () => {
  let resolveRestore;
  const session = new PlayerSession({ fetchImpl: (path) => path.endsWith('/me')
    ? new Promise((resolve) => { resolveRestore = resolve; }) : Promise.resolve(reply({ user: null })) });
  const restoring = session.restore();
  await session.selectGuest();
  resolveRestore(reply({ user: { id: 'old-player', username: 'Old' } }));
  await restoring;
  assert.equal(session.player.kind, 'guest');
});

test('unconfigured scores and another captured identity never reach the API', async () => {
  let requests = 0;
  const session = new PlayerSession({ fetchImpl: async () => { requests += 1; } });
  session.player = { kind: 'named', user: { id: 'current-player' } };
  assert.equal((await session.saveRun({ playerId: 'previous-player' })).reason, 'player_changed');
  assert.equal((await session.saveRun({ playerId: 'current-player', mode: 'classic', rulesVersion: 'draft-v1' })).reason, 'scoring_not_configured');
  assert.equal(requests, 0);
});

test('Hunt submission strips client score fields and preserves the run rules version', async () => {
  let body;
  const session = new PlayerSession({ fetchImpl: async (path, options) => {
    assert.equal(path, '/api/v1/scores'); body = JSON.parse(options.body); return reply({ saved: true });
  } });
  session.player = { kind: 'named', user: { id: 'player' } };
  session.rules = { scoringConfigured: { hunt: true }, version: 'new-version' };
  await session.saveRun({
    playerId: 'player', runId: 'run-1', mode: 'hunt', rulesVersion: 'captured-version', activeDurationMs: 5000, endReason: 'completed',
    levelResults: [{ levelId: 'stage-1', activeDurationMs: 5000, enteredPortal: true, preyCaught: { mouse: 1 }, score: 99999, foodScore: 99999 }],
  });
  assert.equal(body.rulesVersion, 'captured-version');
  assert.equal('playerId' in body, false);
  assert.equal('score' in body.levelResults[0], false);
  assert.equal('foodScore' in body.levelResults[0], false);
});
