import { createHash } from 'node:crypto';
import { ApiError, invalid } from '../../core/errors.js';
import { choice, object, onlyKeys, string, wholeNumber } from '../../core/validation.js';
import { scoringReady } from '../../config/game-rules.js';

export function publicRun(run) {
  const { userId, fingerprint, ...result } = run;
  return result;
}

function safeTotal(value) {
  if (!Number.isSafeInteger(value)) invalid('results', 'Calculated score or duration exceeds the supported range.');
  return value;
}

function calculateHunt(body, rules) {
  if (!Array.isArray(body.levelResults) || body.levelResults.length > rules.hunt.levels.length) {
    invalid('levelResults', 'Must contain completed levels in order, without duplicates.');
  }
  const catalog = new Map(rules.hunt.preyCatalog.map((prey) => [prey.id, prey.points]));
  const levelResults = body.levelResults.map((result, index) => {
    const field = `levelResults[${index}]`;
    onlyKeys(result, ['levelId', 'activeDurationMs', 'enteredPortal', 'preyCaught'], field);
    const level = rules.hunt.levels[index];
    if (result.levelId !== level.id) invalid(`${field}.levelId`, 'Completed levels must follow the configured order.');
    if (result.enteredPortal !== true) invalid(`${field}.enteredPortal`, 'A completed level requires entering its portal.');
    const activeDurationMs = wholeNumber(result.activeDurationMs, `${field}.activeDurationMs`);
    const caught = object(result.preyCaught, `${field}.preyCaught`);
    const expectedIds = Object.keys(level.preyCounts).sort();
    if (Object.keys(caught).sort().join('\0') !== expectedIds.join('\0')) {
      invalid(`${field}.preyCaught`, 'Must contain exactly the configured prey types.');
    }
    let foodScore = 0;
    for (const id of expectedIds) {
      const count = wholeNumber(caught[id], `${field}.preyCaught.${id}`);
      if (count !== level.preyCounts[id]) invalid(`${field}.preyCaught.${id}`, 'All configured prey must be caught.');
      foodScore = safeTotal(foodScore + safeTotal(count * catalog.get(id)));
    }
    // Count active time through portal entry, including the time spent reaching the portal.
    const penaltySeconds = Math.floor(Math.max(0, activeDurationMs - rules.hunt.timeGraceSeconds * 1000) / 1000);
    const rawTimeScore = safeTotal(level.timeBonusMax - safeTotal(penaltySeconds * level.timePenaltyPerSecond));
    const timeScore = rules.hunt.timeScoreFloor === 0 ? Math.max(0, rawTimeScore) : rawTimeScore;
    return {
      levelId: level.id, activeDurationMs, enteredPortal: true,
      preyCaught: Object.fromEntries(expectedIds.map((id) => [id, caught[id]])),
      foodScore, timeScore, score: safeTotal(foodScore + timeScore),
    };
  });
  if (body.endReason === 'completed' && levelResults.length !== rules.hunt.levels.length) {
    invalid('endReason', 'Completing a Hunt run requires entering the portal of every configured level.');
  }
  if (body.endReason !== 'completed' && levelResults.length === rules.hunt.levels.length) {
    invalid('endReason', 'A run containing every completed level must end with completed.');
  }
  const completedDuration = levelResults.reduce((sum, level) => safeTotal(sum + level.activeDurationMs), 0);
  if (body.activeDurationMs < completedDuration) {
    invalid('activeDurationMs', 'Run duration cannot be shorter than the sum of its completed level durations.');
  }
  const foodScore = levelResults.reduce((sum, level) => safeTotal(sum + level.foodScore), 0);
  const timeScore = levelResults.reduce((sum, level) => safeTotal(sum + level.timeScore), 0);
  return { levelResults, scoreBreakdown: { foodScore, timeScore }, score: safeTotal(foodScore + timeScore) };
}

export function calculateSubmission(body, rules) {
  object(body);
  const mode = choice(body.mode, 'mode', ['classic', 'hunt']);
  onlyKeys(body, [
    'runId', 'mode', 'rulesVersion', 'activeDurationMs', 'endReason',
    ...(mode === 'classic' ? ['foodEaten'] : ['levelResults']),
  ]);
  const runId = string(body.runId, 'runId', 36, 36).toLowerCase();
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(runId)) {
    invalid('runId', 'Must be a UUID.');
  }
  const rulesVersion = string(body.rulesVersion, 'rulesVersion');
  if (rulesVersion !== rules.version) {
    throw new ApiError(409, 'RULES_VERSION_MISMATCH', 'Reload the game configuration before starting a new run.');
  }
  const activeDurationMs = wholeNumber(body.activeDurationMs, 'activeDurationMs');
  const endReason = choice(body.endReason, 'endReason', mode === 'classic'
    ? ['collision', 'board_filled', 'quit'] : ['collision', 'completed', 'quit']);
  // Do not substitute placeholder coefficients for undecided game design.
  if (!scoringReady(rules, mode)) {
    throw new ApiError(409, 'SCORING_NOT_CONFIGURED', 'Scoring rules for this mode have not been configured.');
  }
  const base = { runId, mode, rulesVersion, activeDurationMs, endReason };
  if (mode === 'classic') {
    const foodEaten = wholeNumber(body.foodEaten, 'foodEaten');
    const score = safeTotal(foodEaten * rules.classic.pointsPerFood);
    return { ...base, foodEaten, score, scoreBreakdown: { foodScore: score, timeScore: 0 }, levelResults: [] };
  }
  return { ...base, ...calculateHunt(body, rules) };
}

export function createScoreService({ repositories, rules, now }) {
  return {
    async save(userId, body) {
      const result = calculateSubmission(body, rules);
      const fingerprint = createHash('sha256').update(JSON.stringify(result)).digest('hex');
      const saved = await repositories.scores.saveAndUpdateRecord({
        ...result, userId, fingerprint, createdAt: now().toISOString(),
      });
      const limit = 10;
      const [leaderboard, user] = await Promise.all([
        repositories.scores.leaderboard({ mode: result.mode, limit }),
        repositories.users.findById(userId),
      ]);
      const entry = user && leaderboard.find((item) => item.username === user.username);
      return {
        ...saved, run: publicRun(saved.run),
        leaderboard: { limit, qualified: Boolean(entry), rank: entry?.rank ?? null },
      };
    },
    async records(userId) {
      const result = await repositories.scores.listRecords(userId);
      for (const mode of ['classic', 'hunt']) {
        if (result[mode]) {
          const { userId: owner, ...record } = result[mode];
          result[mode] = record;
        }
      }
      return result;
    },
    async history(options) {
      const result = await repositories.scores.listRuns(options);
      return {
        items: result.items.map(publicRun),
        pagination: {
          page: options.page, pageSize: options.pageSize,
          total: result.total, totalPages: Math.ceil(result.total / options.pageSize),
        },
      };
    },
    async leaderboard(options) { return repositories.scores.leaderboard(options); },
  };
}
