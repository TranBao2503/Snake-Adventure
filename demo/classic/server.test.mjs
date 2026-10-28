import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createDemoServer } from './server.mjs';

async function start(t) {
  const server = await createDemoServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('the demo serves its HTML, both engines, session client, styles, and existing snake artwork', async (t) => {
  const base = await start(t);
  const response = await fetch(base);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /id="player-name"/);
  assert.match(html, /id="guest-play"/);
  assert.match(html, /value="hunt"/);
  const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  for (const path of [...assets, '/assets/Head1.png', '/classic/index.html']) {
    const asset = await fetch(new URL(path, `${base}/`));
    assert.equal(asset.status, 200, path);
  }
});

test('same-origin demo APIs support a name, then guest invalidation, without a second server', async (t) => {
  const base = await start(t);
  const named = await fetch(`${base}/api/v1/auth/player`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ username: 'Demo Player' }),
  });
  assert.equal(named.status, 200);
  assert.match(named.headers.get('set-cookie'), /^snake_demo_session=/);
  const cookie = named.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(`${base}/api/v1/auth/me`, { headers: { Cookie: cookie } })).status, 200);
  const guest = await fetch(`${base}/api/v1/auth/guest`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: base }, body: '{}',
  });
  assert.equal(guest.status, 200);
  assert.equal((await fetch(`${base}/api/v1/auth/me`, { headers: { Cookie: cookie } })).status, 401);
});

test('the demo does not expose project files or local configuration', async (t) => {
  const base = await start(t);
  for (const path of ['/backend/.env', '/.git/config', '/README.md', '/hunt/engine.test.mjs']) {
    assert.equal((await fetch(`${base}${path}`)).status, 404);
  }
  const config = await (await fetch(`${base}/api/v1/game-config`)).json();
  assert.equal(config.data.classic.pointsPerFood, null);
  assert.deepEqual(config.data.hunt.levels[0].preyCounts, { mouse: 20 });
  assert.deepEqual(config.data.hunt.levels[1].preyCounts, { mouse: 5, frog: 15 });
  assert.deepEqual(config.data.scoringConfigured, { classic: false, hunt: true });
});
