import test from 'node:test';
import assert from 'node:assert/strict';
import '../classic/engine.js';
import '../../shared/hunt-rules.js';
import './levels.js';
import './engine.js';
import { calculateSubmission } from '../../backend/src/modules/scores/service.js';
import { randomUUID } from 'node:crypto';

const { HuntGame } = globalThis.HuntSnake;

function onePreyRules() {
  const rules = structuredClone(globalThis.HuntRules);
  rules.levels = [{ ...rules.levels[0], preyCounts: { mouse: 1 } }];
  return rules;
}

function catchLastPrey(game) {
  game.prey = [{ id: 'last', type: 'mouse', x: game.snake[0].x + 1, y: game.snake[0].y }];
  game.caught = { ...game.level.preyCounts, mouse: game.level.preyCounts.mouse - 1 };
  game.tick();
}

test('stage one contains 20 mice and stage two contains exactly 5 mice and 15 frogs', () => {
  const game = new HuntGame({ random: () => .5 });
  assert.equal(game.prey.length, 20);
  assert.ok(game.prey.every((prey) => prey.type === 'mouse'));
  game.status = 'levelcomplete';
  game.nextLevel();
  assert.equal(game.rules.levels.length, 2);
  assert.equal(game.level.featuredPreyId, 'frog');
  assert.equal(game.prey.filter((prey) => prey.type === 'frog').length, 15);
  assert.equal(game.prey.filter((prey) => prey.type === 'mouse').length, 5);
  assert.equal(game.snake.length, 3);
  assert.equal(game.status, 'ready');
});

test('catching the last prey keeps snake length fixed and opens a portal without completing the stage', () => {
  const game = new HuntGame({ rules: onePreyRules() });
  game.start();
  catchLastPrey(game);
  assert.equal(game.snake.length, 3);
  assert.equal(game.totalCaught, 1);
  assert.equal(game.prey.length, 0);
  assert.equal(game.phase, 'portal');
  assert.equal(game.status, 'running');
  assert.equal(game.completedLevels.length, 0);
  assert.equal(game.isWall(game.portal), false);
  assert.equal(game.snake.some((cell) => cell.x === game.portal.x && cell.y === game.portal.y), false);
});

test('the portal is reachable without crossing the current snake body', () => {
  const game = new HuntGame({ rules: onePreyRules() });
  game.start(); catchLastPrey(game);
  const blocked = new Set(game.snake.slice(1).map((cell) => `${cell.x},${cell.y}`));
  const queue = [game.snake[0]];
  const visited = new Set();
  for (let index = 0; index < queue.length; index += 1) {
    const cell = queue[index];
    const key = `${cell.x},${cell.y}`;
    if (visited.has(key) || blocked.has(key) || game.isWall(cell)) continue;
    visited.add(key);
    for (const vector of Object.values(globalThis.ClassicSnake.DIRECTIONS)) queue.push({ x: cell.x + vector.x, y: cell.y + vector.y });
  }
  assert.equal(visited.has(`${game.portal.x},${game.portal.y}`), true);
});

test('time includes the route to the portal and stops exactly at entry', () => {
  const game = new HuntGame({ rules: onePreyRules() });
  game.start(); catchLastPrey(game);
  const afterCapture = game.activeDurationMs;
  game.tick();
  assert.equal(game.activeDurationMs, afterCapture + 125);
  assert.equal(game.status, 'running');
  game.portal = { x: game.snake[0].x + 1, y: game.snake[0].y };
  game.tick();
  assert.equal(game.status, 'won');
  assert.equal(game.completedLevels[0].activeDurationMs, afterCapture + 250);
  const stopped = game.activeDurationMs;
  game.tick();
  assert.equal(game.activeDurationMs, stopped);
  assert.equal(game.completedLevels.length, 1);
});

test('pause and stage introductions freeze time, while the next stage restores the same snake length', () => {
  const game = new HuntGame();
  game.tick();
  assert.equal(game.activeDurationMs, 0);
  game.start(); game.tick(); game.togglePause();
  const duration = game.activeDurationMs;
  game.tick();
  assert.equal(game.activeDurationMs, duration);
  game.togglePause();
  catchLastPrey(game);
  game.portal = { x: game.snake[0].x + 1, y: game.snake[0].y };
  game.tick();
  assert.equal(game.status, 'levelcomplete');
  game.nextLevel();
  assert.equal(game.status, 'ready');
  assert.equal(game.activeDurationMs, 0);
  assert.equal(game.snake.length, 3);
  assert.equal(game.completedLevels.length, 1);
});

test('crossing the one-minute mark applies overtime without causing a timeout', () => {
  const rules = onePreyRules();
  rules.preyCatalog[0].moveIntervalMs = 1000000;
  const game = new HuntGame({ rules });
  game.movement.snake = [{ x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 }];
  game.prey = [{ id: 'safe', type: 'mouse', x: 10, y: 10 }];
  game.start();
  for (let tick = 0; tick < 488; tick += 1) {
    const head = game.snake[0];
    if (head.x === 19 && game.direction === 'right') game.queueTurn('down');
    if (head.y === 19 && game.direction === 'down') game.queueTurn('left');
    if (head.x === 4 && game.direction === 'left') game.queueTurn('up');
    if (head.y === 4 && game.direction === 'up') game.queueTurn('right');
    game.tick();
  }
  assert.equal(game.activeDurationMs, 61000);
  assert.equal(game.penaltySeconds, 1);
  assert.equal(game.status, 'running');
});

test('prey movement never enters a wall, the snake, or another prey cell', () => {
  const game = new HuntGame({ random: () => .4 });
  game.prey = [
    { id: 'mouse', type: 'mouse', x: 1, y: 1 },
    { id: 'mouse-2', type: 'mouse', x: 2, y: 2 },
    { id: 'frog', type: 'frog', x: 4, y: 4 },
  ];
  const original = structuredClone(game.prey);
  for (let tick = 1; tick <= 100; tick += 1) {
    game.levelTicks = tick;
    game.movePrey();
    assert.equal(new Set(game.prey.map((prey) => `${prey.x},${prey.y}`)).size, 3);
    for (const prey of game.prey) {
      assert.equal(game.isWall(prey), false);
      assert.equal(game.snake.some((cell) => cell.x === prey.x && cell.y === prey.y), false);
    }
  }
  assert.notDeepEqual(game.prey, original);
});

test('mice move one cell every 1500 ms and frogs move two cells every 3000 ms', () => {
  for (const [type, ticks, travel] of [['mouse', 12, 1], ['frog', 24, 2]]) {
    const game = new HuntGame({ random: () => 0 });
    game.prey = [{ id: 'prey', type, x: 8, y: 8, lastMoveAtMs: 0 }];
    game.levelTicks = ticks - 1;
    game.movePrey();
    assert.deepEqual([game.prey[0].x, game.prey[0].y], [8, 8]);
    game.levelTicks = ticks;
    game.movePrey();
    const first = { ...game.prey[0] };
    assert.equal(Math.abs(first.x - 8) + Math.abs(first.y - 8), travel);
    assert.ok(Math.abs(first.x - 12) + Math.abs(first.y - 12) > 8);
    game.levelTicks = ticks * 2 - 1;
    game.movePrey();
    assert.deepEqual(game.prey[0], first);
    game.levelTicks = ticks * 2;
    game.movePrey();
    assert.equal(Math.abs(game.prey[0].x - first.x) + Math.abs(game.prey[0].y - first.y), travel);
  }
});

test('frogs wait instead of making a one-cell hop when a full escape jump would hit a wall', () => {
  const game = new HuntGame({ random: () => 0 });
  game.prey = [{ id: 'frog', type: 'frog', x: 1, y: 2 }];
  game.levelTicks = 24;
  game.movePrey();
  assert.deepEqual([game.prey[0].x, game.prey[0].y], [1, 2]);
});

test('frogs cannot jump through body cells or land on them', () => {
  for (const blockers of [[{ x: 3, y: 2 }, { x: 2, y: 3 }], [{ x: 3, y: 1 }, { x: 1, y: 3 }]]) {
    const game = new HuntGame({ random: () => 0 });
    game.movement.snake = [{ x: 12, y: 12 }, ...blockers];
    game.prey = [{ id: 'frog', type: 'frog', x: 3, y: 3 }];
    game.levelTicks = 24;
    game.movePrey();
    assert.deepEqual([game.prey[0].x, game.prey[0].y], [3, 3]);
  }
});

test('both stages reset to the same 1000-point bonus and one-minute grace period', () => {
  const game = new HuntGame();
  assert.equal(game.rules.timeGraceSeconds, 60);
  assert.deepEqual(game.levelScore(), { foodScore: 2000, timeScore: 1000, score: 3000 });
  game.levelTicks = 488;
  assert.equal(game.levelScore().timeScore, 990);
  game.status = 'levelcomplete'; game.nextLevel();
  assert.equal(game.activeDurationMs, 0);
  assert.deepEqual(game.levelScore(), { foodScore: 2750, timeScore: 1000, score: 3750 });
});

test('time bonus decreases by 10 per complete overtime second and never becomes negative', () => {
  const game = new HuntGame({ stepMs: 1 });
  for (const [duration, expected] of [[60000, 1000], [60999, 1000], [61000, 990], [159999, 10], [160000, 0], [300000, 0]]) {
    game.levelTicks = duration;
    assert.equal(game.levelScore().timeScore, expected);
  }
});

test('running out of time points does not stop the game or disable its portal', () => {
  const game = new HuntGame({ rules: onePreyRules() });
  game.start(); game.levelTicks = 1600;
  catchLastPrey(game);
  assert.equal(game.levelScore().timeScore, 0);
  assert.equal(game.status, 'running');
  assert.equal(game.phase, 'portal');
  game.portal = { x: game.snake[0].x + 1, y: game.snake[0].y };
  game.tick();
  assert.equal(game.status, 'won');
  assert.equal(game.completedLevels[0].score, 100);
});

test('hitting a wall or body after opening a portal still loses the unfinished stage', () => {
  for (const snake of [
    [{ x: 22, y: 12 }, { x: 21, y: 12 }, { x: 20, y: 12 }],
    [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 5 }, { x: 7, y: 5 }],
  ]) {
    const game = new HuntGame({ rules: onePreyRules() });
    game.start(); catchLastPrey(game);
    game.movement.snake = snake;
    game.tick();
    assert.equal(game.status, 'gameover');
    assert.deepEqual(game.completedLevels, []);
  }
});

test('unconfigured coefficients stay null in a completed stage', () => {
  const game = new HuntGame({ rules: onePreyRules() });
  game.catalog.get('mouse').points = null;
  game.level.timeBonusMax = null;
  game.start(); catchLastPrey(game);
  game.portal = { x: game.snake[0].x + 1, y: game.snake[0].y };
  game.tick();
  assert.deepEqual(game.levelScore(), { foodScore: null, timeScore: null, score: null });
});

test('configured stage results match backend scoring, including portal travel time', () => {
  const hunt = structuredClone(globalThis.HuntRules);
  hunt.timeScoreFloor = 0;
  hunt.preyCatalog.forEach((prey) => { prey.points = 10; });
  hunt.levels.forEach((level) => { level.timeBonusMax = 100; level.timePenaltyPerSecond = 2; });
  const game = new HuntGame({ rules: hunt });
  game.start(); game.levelTicks = 598; catchLastPrey(game);
  game.portal = { x: game.snake[0].x + 1, y: game.snake[0].y };
  game.tick();
  const level = game.completedLevels[0];
  const result = calculateSubmission({
    runId: randomUUID(), mode: 'hunt', rulesVersion: 'fixture-v1', endReason: 'collision',
    activeDurationMs: level.activeDurationMs,
    levelResults: [{ levelId: level.levelId, enteredPortal: true, activeDurationMs: level.activeDurationMs, preyCaught: level.preyCaught }],
  }, { version: 'fixture-v1', classic: { pointsPerFood: null }, hunt });
  assert.equal(result.score, level.score);
  assert.equal(result.scoreBreakdown.timeScore, 70);
  assert.equal(result.scoreBreakdown.foodScore, 200);
});

test('wall collisions still end the Hunt and restart clears the entire campaign', () => {
  const game = new HuntGame();
  game.movement.snake = [{ x: 22, y: 12 }, { x: 21, y: 12 }, { x: 20, y: 12 }];
  game.start(); game.tick();
  assert.equal(game.status, 'gameover');
  assert.equal(game.reason, 'wall');
  game.reset();
  assert.equal(game.status, 'ready');
  assert.equal(game.levelIndex, 0);
  assert.equal(game.totalCaught, 0);
  assert.deepEqual(game.completedLevels, []);
});
