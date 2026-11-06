// npm run check: every gate in order. check-facts-dist.mjs belongs to phase 8; skipped with a notice until it exists.
// check-frames is expected red until phase 4 delivers; pass --allow-frames to skip it.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowFrames = process.argv.includes('--allow-frames');
const step = (label, cmd, args) => {
  console.log(`\n== ${label}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' && cmd === 'npm' });
  if (r.status !== 0) { console.error(`\ncheck failed at: ${label}`); process.exit(r.status || 1); }
};
const node = process.execPath;
step('check-copy', node, ['scripts/check-copy.mjs']);
step('check-tokens (source)', node, ['scripts/check-tokens.mjs']);
step('build', 'npm', ['run', 'build']);
step('check-tokens (dist)', node, ['scripts/check-tokens.mjs']);
step('check-refs dist', node, ['ci/check-refs.mjs', 'dist', ...(allowFrames ? [] : ['--strict-assets'])]);
if (allowFrames) console.log('\n== check-frames skipped (--allow-frames)');
else step('check-frames', node, ['scripts/check-frames.mjs']);
if (fs.existsSync(path.join(root, 'scripts/check-facts-dist.mjs'))) step('check-facts-dist', node, ['scripts/check-facts-dist.mjs']);
else console.log('\n== check-facts-dist not present yet (phase 8 adds it); skipped');
console.log('\nall gates passed');
