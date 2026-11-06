// Bundles every client script into ONE classic IIFE: public/js/site.js.
// Module scripts and fetch() are dead on file:// (null origin), so this is the only shape that opens from disk.
// Usage: node scripts/build-client.mjs [--watch]
import path from 'node:path';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');

const options = {
  entryPoints: [path.join(root, 'src/scripts/main.ts')],
  bundle: true,
  format: 'iife',
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  target: 'es2020',
  legalComments: 'none',
  outfile: path.join(root, 'public/js/site.js'),
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('[client] watching src/scripts -> public/js/site.js');
} else {
  await esbuild.build(options);
  const buf = fs.readFileSync(options.outfile);
  const gz = zlib.gzipSync(buf).length;
  console.log(`[client] public/js/site.js ${(buf.length / 1024).toFixed(1)} KB min, ${(gz / 1024).toFixed(1)} KB gzip (budget 150 / 58)`);
}
