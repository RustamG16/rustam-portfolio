// astro dev + esbuild --watch together. Serves http://localhost:4321/rustam-portfolio/
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args) => spawn(process.execPath, [path.join(root, 'node_modules', cmd), ...args], { cwd: root, stdio: 'inherit' });

const extra = process.argv.slice(2);

const client = spawn(process.execPath, [path.join(root, 'scripts/build-client.mjs'), '--watch'], { cwd: root, stdio: 'inherit' });
const astro = run('astro/astro.js', ['dev', ...extra]);
const stop = () => { client.kill(); astro.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
astro.on('exit', stop);
