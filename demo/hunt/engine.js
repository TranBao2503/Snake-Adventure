(() => {
  'use strict';

  const { ClassicGame, DIRECTIONS } = globalThis.ClassicSnake;
  const sameCell = (a, b) => a.x === b.x && a.y === b.y;
  const key = (cell) => `${cell.x},${cell.y}`;
  const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  class HuntGame {
    constructor({ rules = globalThis.HuntRules, size = 24, random = Math.random, stepMs = 125 } = {}) {
      if (!rules?.levels?.length) throw new Error('The Hunt requires at least one configured stage.');
      this.rules = structuredClone(rules);
      this.catalog = new Map(this.rules.preyCatalog.map((prey) => [prey.id, prey]));
      this.random = random;
      this.stepMs = stepMs;
      this.movement = new ClassicGame({ size, random });
      this.reset();
    }

    get size() { return this.movement.size; }
    get snake() { return this.movement.snake; }
    get direction() { return this.movement.direction; }
    get food() { return null; }
    get foodEaten() { return this.totalCaught; }
    get level() { return this.rules.levels[this.levelIndex]; }
    get activeDurationMs() { return this.levelTicks * this.stepMs; }
    get penaltySeconds() { return Math.floor(Math.max(0, this.activeDurationMs - this.rules.timeGraceSeconds * 1000) / 1000); }
    isWall(cell) { return this.movement.isWall(cell); }

    reset() {
      this.levelIndex = 0;
      this.completedLevels = [];
      this.totalCaught = 0;
      this.prepareLevel();
    }

    prepareLevel() {
      this.movement.reset();
      this.movement.food = null;
      this.status = 'ready';
      this.phase = 'hunting';
      this.reason = null;
      this.portal = null;
      this.levelTicks = 0;
      this.caught = Object.fromEntries(Object.keys(this.level.preyCounts).map((id) => [id, 0]));
      this.prey = [];
      for (const [type, count] of Object.entries(this.level.preyCounts)) {
        if (!this.catalog.has(type) || !Number.isInteger(count) || count < 1) throw new Error('Invalid stage prey quota.');
        for (let index = 0; index < count; index += 1) {
          const position = this.pickFreeCell();
          if (!position) throw new Error('Stage contains more prey than free cells.');
          this.prey.push({ id: `${type}-${index}`, type, ...position, lastMoveAtMs: 0 });
        }
      }
    }

    pickFreeCell() {
      const occupied = new Set([...this.snake, ...this.prey].map(key));
      const free = [];
      for (let y = 1; y < this.size - 1; y += 1) {
        for (let x = 1; x < this.size - 1; x += 1) {
          if (!occupied.has(`${x},${y}`)) free.push({ x, y });
        }
      }
      return free.length ? free[Math.min(free.length - 1, Math.max(0, Math.floor(this.random() * free.length)))] : null;
    }

    start() {
      if (this.status !== 'ready') return;
      this.movement.start();
      this.status = 'running';
    }

    queueTurn(direction) { return this.status === 'running' && this.movement.queueTurn(direction); }

    togglePause() {
      if (!['running', 'paused'].includes(this.status)) return;
      this.movement.togglePause();
      this.status = this.movement.status;
    }

    openPortal() {
      // A breadth-first search chooses an empty exit reachable around the current body.
      const blocked = new Set(this.snake.slice(1).map(key));
      const queue = [{ ...this.snake[0] }];
      const visited = new Set([key(queue[0])]);
      for (let index = 0; index < queue.length; index += 1) {
        for (const vector of Object.values(DIRECTIONS)) {
          const next = { x: queue[index].x + vector.x, y: queue[index].y + vector.y };
          if (this.isWall(next) || blocked.has(key(next)) || visited.has(key(next))) continue;
          visited.add(key(next));
          queue.push(next);
        }
      }
      this.portal = queue.at(-1);
      this.phase = 'portal';
    }

    movePrey() {
      const snakeCells = new Set(this.snake.map(key));
      const occupied = new Set(this.prey.map(key));
      for (const prey of this.prey) {
        const behavior = this.catalog.get(prey.type);
        const intervalMs = behavior.moveIntervalMs ?? (behavior.moveEveryTicks ?? 4) * this.stepMs;
        const lastMoveAtMs = prey.lastMoveAtMs ?? 0;
        if (this.activeDurationMs - lastMoveAtMs < intervalMs) continue;
        prey.lastMoveAtMs = lastMoveAtMs + intervalMs;
        occupied.delete(key(prey));
        const moveDistance = behavior.moveDistance ?? (behavior.behavior === 'hop' ? 2 : 1);
        const moves = [];
        for (const vector of Object.values(DIRECTIONS)) {
          let target = null;
          let blocked = false;
          // A frog either completes its full two-cell hop or waits for its next turn.
          for (let step = 1; step <= moveDistance; step += 1) {
            target = { x: prey.x + vector.x * step, y: prey.y + vector.y * step };
            if (this.isWall(target) || snakeCells.has(key(target)) || occupied.has(key(target))) {
              blocked = true;
              break;
            }
          }
          if (!blocked && target) moves.push(target);
        }
        if (moves.length) {
          let candidates = moves;
          if (behavior.behavior === 'flee') {
            const farther = moves.filter((cell) => distance(cell, this.snake[0]) > distance(prey, this.snake[0]));
            const farthest = Math.max(...farther.map((cell) => distance(cell, this.snake[0])));
            candidates = farther.filter((cell) => distance(cell, this.snake[0]) === farthest);
          }
          if (candidates.length) {
            const target = candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(this.random() * candidates.length)))];
            prey.x = target.x;
            prey.y = target.y;
          }
        }
        occupied.add(key(prey));
      }
    }

    levelScore() {
      const foodConfigured = Object.keys(this.level.preyCounts).every((id) => Number.isSafeInteger(this.catalog.get(id).points));
      const foodScore = foodConfigured
        ? Object.entries(this.level.preyCounts).reduce((sum, [id, count]) => sum + count * this.catalog.get(id).points, 0) : null;
      const timeConfigured = Number.isSafeInteger(this.level.timeBonusMax) && Number.isSafeInteger(this.level.timePenaltyPerSecond)
        && [0, 'unbounded'].includes(this.rules.timeScoreFloor);
      const raw = timeConfigured ? this.level.timeBonusMax - this.penaltySeconds * this.level.timePenaltyPerSecond : null;
      const timeScore = raw === null ? null : this.rules.timeScoreFloor === 0 ? Math.max(0, raw) : raw;
      return { foodScore, timeScore, score: foodScore === null || timeScore === null ? null : foodScore + timeScore };
    }

    tick() {
      if (this.status !== 'running') return;
      this.levelTicks += 1;
      this.movement.tick();
      if (this.movement.status === 'gameover') {
        this.status = 'gameover';
        this.reason = this.movement.reason;
        return;
      }
      if (this.phase === 'portal') {
        if (sameCell(this.snake[0], this.portal)) {
          this.completedLevels.push({
            levelId: this.level.id, activeDurationMs: this.activeDurationMs,
            enteredPortal: true, preyCaught: { ...this.caught }, ...this.levelScore(),
          });
          this.phase = 'complete';
          this.status = this.levelIndex === this.rules.levels.length - 1 ? 'won' : 'levelcomplete';
        }
        return;
      }
      const caught = this.prey.find((prey) => sameCell(this.snake[0], prey));
      if (caught) {
        this.prey = this.prey.filter((prey) => prey !== caught);
        this.caught[caught.type] += 1;
        this.totalCaught += 1;
      }
      if (!this.prey.length) this.openPortal();
      else this.movePrey();
    }

    nextLevel() {
      if (this.status !== 'levelcomplete') return;
      this.levelIndex += 1;
      this.prepareLevel();
    }
  }

  globalThis.HuntSnake = Object.freeze({ HuntGame });
})();
