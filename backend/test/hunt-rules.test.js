import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { gameRules } from '../src/config/game-rules.js';
import { calculateSubmission } from '../src/modules/scores/service.js';
import { harness } from './helpers.js';

function huntRun(durations = [45000, 45000]) {
  return {
    runId: randomUUID(), mode: 'hunt', rulesVersion: gameRules.version,
    activeDurationMs: durations.reduce((sum, duration) => sum + duration, 0), endReason: 'completed',
    levelResults: gameRules.hunt.levels.map((level, index) => ({
      levelId: level.id, activeDurationMs: durations[index], enteredPortal: true,
      preyCaught: { ...level.preyCounts },
    })),
  };
}

test('approved Hunt rules share the same timer and specify the exact movement and score values', () => {
  assert.deepEqual(gameRules.hunt.preyCatalog.map((prey) => [prey.id, prey.points, prey.moveIntervalMs, prey.moveDistance]), [
    ['mouse', 100, 1500, 1], ['frog', 150, 3000, 2],
  ]);
  assert.ok(gameRules.hunt.preyCatalog.every((prey) => prey.behavior === 'flee'));
  assert.ok(gameRules.hunt.levels.every((level) => level.timeBonusMax === 1000 && level.timePenaltyPerSecond === 10));
  assert.equal(gameRules.hunt.timeGraceSeconds, 60);
  assert.equal(gameRules.hunt.timeScoreFloor, 0);
});

test('approved prey quotas give fixed food scores of 2000 and 2750 and a maximum run score of 6750', () => {
  const result = calculateSubmission(huntRun(), gameRules);
  assert.deepEqual(result.levelResults.map((level) => level.foodScore), [2000, 2750]);
  assert.deepEqual(result.levelResults.map((level) => level.timeScore), [1000, 1000]);
  assert.equal(result.score, 6750);
});

test('each stage independently holds its bonus for 60 seconds, then subtracts 10 per full second', () => {
  for (const [duration, expected] of [[60000, 1000], [60999, 1000], [61000, 990], [159999, 10], [160000, 0], [300000, 0]]) {
    const result = calculateSubmission(huntRun([duration, duration]), gameRules);
    assert.deepEqual(result.levelResults.map((level) => level.timeScore), [expected, expected]);
    assert.equal(result.score, 4750 + expected * 2);
  }
});

test('the backend requires exact quotas and portal entry before counting a stage', () => {
  for (const change of [
    (body) => { body.levelResults[0].preyCaught.mouse = 19; },
    (body) => { body.levelResults[1].preyCaught.frog = 14; },
    (body) => { body.levelResults[1].preyCaught.mouse = 6; },
    (body) => { body.levelResults[0].enteredPortal = false; },
  ]) {
    const body = huntRun();
    change(body);
    assert.throws(() => calculateSubmission(body, gameRules), (error) => error.code === 'VALIDATION_ERROR');
  }
  const lost = { ...huntRun(), levelResults: [], endReason: 'collision' };
  assert.equal(calculateSubmission(lost, gameRules).score, 0);
});

test('named players can now save and rank an actual configured Hunt run, while guests cannot', async (t) => {
  const api = await harness(t);
  const named = await api.request('/auth/player', { method: 'POST', body: { username: 'Hunt Player' } });
  const cookie = named.headers.get('set-cookie').split(';')[0];
  const body = huntRun();
  const saved = await api.request('/scores', { method: 'POST', cookie, body });
  assert.equal(saved.status, 201);
  assert.equal(saved.body.data.run.score, 6750);
  assert.deepEqual(saved.body.data.leaderboard, { limit: 10, qualified: true, rank: 1 });
  const retry = await api.request('/scores', { method: 'POST', cookie, body });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.data.duplicate, true);
  const board = await api.request('/leaderboard?mode=hunt');
  assert.equal(board.body.data.items[0].username, 'Hunt Player');
  assert.equal(board.body.data.items[0].score, 6750);
  await api.request('/auth/guest', { method: 'POST', cookie, body: {} });
  assert.equal((await api.request('/scores', { method: 'POST', cookie, body: huntRun() })).status, 401);
});
