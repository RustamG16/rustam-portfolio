// Measures size-adjust / ascent / descent overrides for the metric-matched fallback faces in src/styles/fonts.css.
// Compares each loaded woff2 with its system fallback in system Chrome (canvas measureText), then prints the
// @font-face descriptors to paste. Run after a font change: node scripts/measure-fallbacks.mjs
import path from 'node:path';
import { serve, launch, siteRoot } from '../qa/lib.mjs';

const server = await serve(path.join(siteRoot, 'dist'));
const browser = await launch();
const page = await browser.newPage();
await page.goto(server.url, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);

const SAMPLE = 'Rustam Gurbanov Engineer Orchestrator Designer 2026 abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const targets = [
  { name: 'Archivo Fallback', web: '900 100px Archivo', fallback: 'bold 100px Arial' },
  { name: 'Newsreader Fallback', web: '400 100px Newsreader', fallback: '400 100px Georgia' },
  { name: 'Inter Fallback', web: '500 100px Inter', fallback: '400 100px Arial' },
];
const out = await page.evaluate(
  async (targets, sample) => {
    const c = document.createElement('canvas').getContext('2d');
    const res = [];
    for (const t of targets) {
      await document.fonts.load(t.web, sample);
      c.font = t.web;
      const w = c.measureText(sample);
      c.font = t.fallback;
      const f = c.measureText(sample);
      res.push({ name: t.name, webW: w.width, fbW: f.width, asc: w.fontBoundingBoxAscent, desc: w.fontBoundingBoxDescent });
    }
    return res;
  },
  targets,
  SAMPLE,
);
await browser.close();
await server.close();

for (const r of out) {
  const sizeAdjust = r.webW / r.fbW;
  const asc = r.asc / 100 / sizeAdjust;
  const desc = r.desc / 100 / sizeAdjust;
  console.log(`${r.name}: size-adjust ${(sizeAdjust * 100).toFixed(2)}%; ascent-override ${(asc * 100).toFixed(2)}%; descent-override ${(desc * 100).toFixed(2)}%; line-gap-override 0%`);
}
