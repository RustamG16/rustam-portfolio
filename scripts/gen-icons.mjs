// Renders public/apple-touch-icon.png (180x180) from the 12-bar RG mark (geometry from design.json).
// Needs system Chrome (CHROME_PATH). Run once after a mark amendment: node scripts/gen-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { siteRoot, launch } from '../qa/lib.mjs';

const design = JSON.parse(fs.readFileSync(path.join(siteRoot, 'design.json'), 'utf8'));
const m = design.tokens.mark;
const c = design.tokens.colors;
const pad = 34;
const bars = m.x
  .map((x, i) => `<rect x="${x}" y="0" width="${m.width[i]}" height="${m.barHeight}" fill="${i === m.accentIndex ? c.cherry : c.cotton}"/>`)
  .join('');
const html = `<!doctype html><body style="margin:0;background:${c.noir}"><svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="${-pad * 100 / 112} ${-pad * 100 / 112} ${100 + 2 * pad * 100 / 112} ${100 + 2 * pad * 100 / 112}" shape-rendering="geometricPrecision">${bars}</svg></body>`;
const browser = await launch({ viewport: { width: 180, height: 180 } });
const page = await browser.newPage();
await page.setContent(html);
await page.screenshot({ path: path.join(siteRoot, 'public/apple-touch-icon.png'), clip: { x: 0, y: 0, width: 180, height: 180 } });
await browser.close();
console.log('public/apple-touch-icon.png written');
