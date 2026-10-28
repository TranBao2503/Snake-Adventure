(() => {
  'use strict';

  class PlayerSession {
    constructor({ fetchImpl = globalThis.fetch?.bind(globalThis), localFile = false } = {}) {
      this.fetch = fetchImpl;
      this.localFile = localFile;
      this.player = null;
      this.rules = null;
      this.revision = 0;
    }

    async request(path, { body } = {}) {
      if (this.localFile) throw Object.assign(new Error('Open the demo server to use named play.'), { code: 'SERVER_REQUIRED' });
      try {
        const response = await this.fetch(`/api/v1${path}`, {
          method: body === undefined ? 'GET' : 'POST', credentials: 'include',
          headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw Object.assign(new Error(payload.error?.message ?? 'API request failed.'), { code: payload.error?.code ?? 'API_ERROR' });
        }
        return payload.data;
      } catch (error) {
        if (error.code) throw error;
        throw Object.assign(new Error('The game server is unavailable.'), { code: 'NETWORK_ERROR' });
      }
    }

    async restore() {
      if (this.localFile) return null;
      const revision = this.revision;
      try {
        const result = await this.request('/auth/me');
        if (this.revision === revision) this.player = { kind: 'named', user: result.user };
      } catch (error) {
        if (error.code !== 'UNAUTHENTICATED') throw error;
      }
      return this.player;
    }

    async selectName(username) {
      const revision = ++this.revision;
      const result = await this.request('/auth/player', { body: { username } });
      if (revision === this.revision) this.player = { kind: 'named', user: result.user };
      return this.player;
    }

    async selectGuest() {
      ++this.revision;
      this.player = { kind: 'guest', user: null };
      if (!this.localFile) {
        try { await this.request('/auth/guest', { body: {} }); }
        catch { /* Guest gameplay remains available if the local API is offline. */ }
      }
      return this.player;
    }

    async loadRules() {
      if (this.localFile) return null;
      this.rules = await this.request('/game-config');
      return this.rules;
    }

    leaderboard(mode) { return this.request(`/leaderboard?mode=${mode}&limit=10`); }

    async saveRun(run) {
      // Check the captured identity before making any request, including configuration reads.
      if (this.player?.kind !== 'named') return { saved: false, reason: 'guest' };
      if (this.player.user.id !== run.playerId) return { saved: false, reason: 'player_changed' };
      if (!run.rulesVersion || !this.rules?.scoringConfigured?.[run.mode]) {
        return { saved: false, reason: 'scoring_not_configured' };
      }
      const body = {
        runId: run.runId, mode: run.mode, rulesVersion: run.rulesVersion,
        activeDurationMs: run.activeDurationMs, endReason: run.endReason,
      };
      if (run.mode === 'classic') body.foodEaten = run.foodEaten;
      else body.levelResults = run.levelResults.map((level) => ({
        levelId: level.levelId, activeDurationMs: level.activeDurationMs,
        enteredPortal: level.enteredPortal, preyCaught: level.preyCaught,
      }));
      return this.request('/scores', { body });
    }
  }

  globalThis.ClassicPlayer = Object.freeze({ PlayerSession });
})();
