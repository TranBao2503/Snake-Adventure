import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../backend/src/app.js';
import { readEnvironment } from '../../backend/src/config/environment.js';

export async function createDemoServer(options = {}) {
  const config = { ...readEnvironment(), ...options.config, cookieName: options.config?.cookieName ?? 'snake_demo_session' };
  const api = createApp({ ...options, config });
  const files = new Map();
  const classicFiles = [
    ['index.html', 'text/html; charset=utf-8'], ['style.css', 'text/css; charset=utf-8'],
    ['engine.js', 'text/javascript; charset=utf-8'], ['game.js', 'text/javascript; charset=utf-8'],
    ['player-session.js', 'text/javascript; charset=utf-8'],
  ];
  for (const [name, contentType] of classicFiles) {
    const file = [new URL(name, import.meta.url), contentType];
    files.set(`/${name}`, file);
    files.set(`/classic/${name}`, file);
  }
  files.set('/', files.get('/index.html'));
  files.set('/classic/', files.get('/index.html'));
  files.set('/shared/hunt-rules.js', [new URL('../../shared/hunt-rules.js', import.meta.url), 'text/javascript; charset=utf-8']);
  for (const name of ['levels.js', 'engine.js']) {
    files.set(`/hunt/${name}`, [new URL(`../hunt/${name}`, import.meta.url), 'text/javascript; charset=utf-8']);
  }
  for (const asset of await readdir(new URL('assets/', import.meta.url), { withFileTypes: true })) {
    if (!asset.isFile() || !asset.name.endsWith('.png')) continue;
    const file = [new URL(`assets/${asset.name}`, import.meta.url), 'image/png'];
    files.set(`/assets/${asset.name}`, file);
    files.set(`/classic/assets/${asset.name}`, file);
  }

  // Serve only explicit demo assets and API routes, without exposing other project files.
  return createServer(async (request, response) => {
    let pathname;
    try { pathname = new URL(request.url, 'http://127.0.0.1').pathname; }
    catch { response.writeHead(400); response.end('Invalid URL.'); return; }
    if (pathname === '/api/v1' || pathname.startsWith('/api/v1/')) {
      api(request, response);
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
    }
    if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const file = files.get(pathname);
    if (!file) { response.writeHead(404); response.end('Not found.'); return; }
    try {
      const contents = await readFile(file[0]);
      response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : contents);
    } catch {
      response.writeHead(500); response.end('Unable to read demo asset.');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.DEMO_PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DEMO_PORT must be between 1 and 65535.');
  const server = await createDemoServer();
  server.listen(port, '127.0.0.1', () => console.log(`Snake Adventure demo: http://127.0.0.1:${port}`));
  server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => { server.close(); server.closeAllConnections(); });
  }
}
