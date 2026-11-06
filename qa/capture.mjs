// Every route EN+DE at 1440x900, 1024x768, 390x844 (+1920x1080 home). Records console errors, failed requests,
// horizontal overflow, and a viewport screenshot per route/size.
// Usage: node qa/capture.mjs [--out <dir>] [--prefix 06-] [--dist dist] [--only home,cv] [--full]
//   default out: ../_verify/rg-convenium/   (outside the repo)
import path from 'node:path';
import fs from 'node:fs';
import { serve, launch, watch, shot, sleep, siteRoot } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const out = path.resolve(siteRoot, arg('out', '../_verify/rg-convenium'));
const prefix = arg('prefix', '');
const dist = path.resolve(siteRoot, arg('dist', 'dist'));
const only = arg('only', '').split(',').filter(Boolean);
const full = process.argv.includes('--full');

const ROUTES = [
  { id: 'home-en', path: '' }, { id: 'home-de', path: 'de/' },
  { id: 'cv-en', path: 'cv/' }, { id: 'cv-de', path: 'de/cv/' },
  { id: 'legal-en', path: 'legal/' }, { id: 'legal-de', path: 'de/legal/' },
  { id: '404', path: '404.html' },
].filter((r) => !only.length || only.some((o) => r.id.startsWith(o)));
const SIZES = [{ w: 1440, h: 900 }, { w: 1024, h: 768 }, { w: 390, h: 844 }];

const server = await serve(dist);
const browser = await launch();
const report = [];
fs.mkdirSync(out, { recursive: true });

for (const r of ROUTES) {
  const sizes = r.id.startsWith('home-en') ? [...SIZES, { w: 1920, h: 1080 }] : SIZES;
  for (const s of sizes) {
    const page = await browser.newPage();
    await page.setViewport({ width: s.w, height: s.h, isMobile: s.w < 640, hasTouch: s.w < 640, deviceScaleFactor: 1 });
    const log = watch(page);
    await page.goto(server.url + r.path, { waitUntil: 'networkidle0' });
    await sleep(1400); // loader curtain (<= 0.9 s) + fonts
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
      js: document.documentElement.dataset.js || null,
    }));
    const file = path.join(out, `${prefix}${r.id}-${s.w}.png`);
    await shot(page, file, { fullPage: full });
    report.push({ route: r.id, size: `${s.w}x${s.h}`, ...m, errors: log.errors, failed: log.failed.filter((f) => !f.includes('favicon')), file: path.relative(siteRoot, file) });
    await page.close();
  }
}
await browser.close();
await server.close();

let bad = 0;
for (const x of report) {
  const flag = x.errors.length || x.failed.length || x.overflow > 0;
  if (flag) bad++;
  console.log(`${flag ? 'FAIL' : 'ok  '} ${x.route.padEnd(9)} ${x.size.padEnd(9)} h=${x.height} overflow=${x.overflow} js=${x.js} errors=${x.errors.length} failed=${x.failed.length}`);
  x.errors.forEach((e) => console.log('     console: ' + e));
  x.failed.forEach((e) => console.log('     failed: ' + e));
}
fs.writeFileSync(path.join(out, `${prefix}capture.json`), JSON.stringify(report, null, 2));
process.exit(bad ? 1 : 0);
