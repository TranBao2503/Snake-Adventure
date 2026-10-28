import express from 'express';
import { readEnvironment } from './config/environment.js';
import { gameRules } from './config/game-rules.js';
import { ApiError } from './core/errors.js';
import { createMemoryRepositories } from './repositories/memory.js';
import { createAuthService } from './modules/auth/service.js';
import { createScoreService } from './modules/scores/service.js';
import { corsAndOrigin, errorHandler, requestContext, requireJson } from './http/middleware.js';
import { createRoutes } from './http/routes.js';

// Inject repository adapters and time so services can be tested without a database.
export function createApp({
  config = readEnvironment(), rules = gameRules,
  repositories = createMemoryRepositories(), now = () => new Date(),
  storage = { name: 'memory', check: async () => false },
} = {}) {
  const app = express();
  const auth = createAuthService({ repositories, config, now });
  const scores = createScoreService({ repositories, rules, now });
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.use(requestContext, corsAndOrigin(config), requireJson);
  app.use(express.json({ limit: '64kb', strict: true }));
  app.use('/api/v1', createRoutes({ auth, scores, rules, config, now, storage }));
  app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'API endpoint was not found.')));
  app.use(errorHandler);
  return app;
}
