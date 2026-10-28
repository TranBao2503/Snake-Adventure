(() => {
  'use strict';

  if (!globalThis.SnakeHuntRules) throw new Error('Load shared/hunt-rules.js before the Hunt level adapter.');
  globalThis.HuntRules = structuredClone(globalThis.SnakeHuntRules);
})();
