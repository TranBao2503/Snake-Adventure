import { Router } from 'express';
import { ApiError } from '../core/errors.js';
import { choice, onlyKeys, queryInteger } from '../core/validation.js';
import { publicGameRules } from '../config/game-rules.js';
import { authenticate, authRateLimit, readCookie, sessionCookieOptions } from './middleware.js';

export function createRoutes({ auth, scores, rules, config, now, storage = { name: 'memory', check: async () => false } }) {
  const router = Router();
  const signedIn = authenticate(auth, config);
  const rateLimit = authRateLimit({ config, now });
  const cookieOptions = sessionCookieOptions(config);

  router.get('/health', async (req, res) => {
    const databaseConnected = await storage.check();
    // Memory storage is always "ok"; a persistent store that cannot answer is "degraded" (HTTP 503).
    const healthy = storage.name === 'memory' || databaseConnected;
    res.status(healthy ? 200 : 503).json({
      data: { status: healthy ? 'ok' : 'degraded', storage: storage.name, databaseConnected },
    });
  });
  router.get('/game-config', (req, res) => res.json({ data: publicGameRules(rules) }));

  router.post('/auth/player', rateLimit, async (req, res) => {
    const result = await auth.playAsName(req.body, readCookie(req, config.cookieName));
    res.cookie(config.cookieName, result.token, { ...cookieOptions, maxAge: config.sessionTtlSeconds * 1000 });
    res.json({ data: { user: result.user, expiresAt: result.expiresAt, canSaveScores: true } });
  });
  router.post('/auth/guest', async (req, res) => {
    onlyKeys(req.body, []);
    await auth.logout(readCookie(req, config.cookieName));
    res.clearCookie(config.cookieName, cookieOptions);
    res.json({ data: { user: null, canSaveScores: false } });
  });

  router.post('/auth/register', rateLimit, async (req, res) => {
    res.status(201).json({ data: { user: await auth.register(req.body) } });
  });
  router.post('/auth/login', rateLimit, async (req, res) => {
    const result = await auth.login(req.body, readCookie(req, config.cookieName));
    res.cookie(config.cookieName, result.token, { ...cookieOptions, maxAge: config.sessionTtlSeconds * 1000 });
    res.json({ data: { user: result.user, expiresAt: result.expiresAt } });
  });
  router.get('/auth/me', signedIn, (req, res) => res.json({ data: req.auth }));
  router.post('/auth/logout', signedIn, async (req, res) => {
    onlyKeys(req.body, []);
    await auth.logout(req.sessionToken);
    res.clearCookie(config.cookieName, cookieOptions);
    res.json({ data: { loggedOut: true } });
  });

  router.post('/scores', signedIn, async (req, res) => {
    const result = await scores.save(req.auth.user.id, req.body);
    res.status(result.duplicate ? 200 : 201).json({ data: { saved: true, ...result } });
  });
  router.get('/me/records', signedIn, (req, res) => scores.records(req.auth.user.id).then((data) => res.json({ data })));
  router.get('/me/scores', signedIn, async (req, res) => {
    onlyKeys(req.query, ['mode', 'page', 'pageSize'], 'query');
    const mode = req.query.mode === undefined ? undefined : choice(req.query.mode, 'mode', ['classic', 'hunt']);
    const page = queryInteger(req.query.page, 'page', 1, 1, 1000000);
    const pageSize = queryInteger(req.query.pageSize, 'pageSize', 20, 1, 100);
    res.json({ data: await scores.history({ userId: req.auth.user.id, mode, page, pageSize }) });
  });
  router.get('/leaderboard', async (req, res) => {
    onlyKeys(req.query, ['mode', 'limit'], 'query');
    const mode = choice(req.query.mode, 'mode', ['classic', 'hunt']);
    const limit = queryInteger(req.query.limit, 'limit', 10, 1, 100);
    res.json({ data: { mode, items: await scores.leaderboard({ mode, limit }) } });
  });

  router.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'API endpoint was not found.')));
  return router;
}
