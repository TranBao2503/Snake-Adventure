import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = await Promise.all(entries.map((entry) => {
    const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    return entry.isDirectory() ? files(path) : entry.name.endsWith('.js') ? [path] : [];
  }));
  return results.flat();
}

const targets = (await Promise.all(['../src/', '../test/', './', '../../shared/'].map((path) => files(new URL(path, import.meta.url))))).flat();
for (const target of targets) {
  const result = spawnSync(process.execPath, ['--check', fileURLToPath(target)], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr || result.error);
    process.exit(1);
  }
}
console.log(`Syntax check passed for ${targets.length} JavaScript files.`);
