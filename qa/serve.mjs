// Serves a build folder under /rustam-portfolio/ exactly like Pages (a plain `serve dist` would serve at / and
// break the base). Usage: node qa/serve.mjs [dist|dist-file] [port]   default dist, 4181
import path from 'node:path';
import { serve, siteRoot } from './lib.mjs';

const dir = path.resolve(siteRoot, process.argv[2] || 'dist');
const port = Number(process.argv[3] || 4181);
const s = await serve(dir, port);
console.log(`serving ${path.relative(siteRoot, dir)} at ${s.url}`);
