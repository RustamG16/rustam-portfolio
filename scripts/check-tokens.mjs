// Discipline gate (architecture.md section 9). Exit 1 on any violation.
// src/** and dist/**/*.css: palette-only hex, no gradient/backdrop-filter/blur, box-shadow only as the ring,
// breakpoints 640/960/1200 only, no .avif, no fetch( in src/scripts, no autoAlpha/visibility: in src/scripts,
// no type="module" in dist html, no google fonts / http(s) script or style origins, no href="/ or src="/ in src.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const bad = (file, msg) => problems.push(`${path.relative(root, file).split(path.sep).join('/')}: ${msg}`);

const md = fs.readFileSync(path.join(root, 'DESIGN.md'), 'utf8').replace(/\r\n/g, '\n');
const fm = yaml.load(md.match(/^---\n([\s\S]*?)\n---\n/)[1]);
const palette = new Set(Object.values(fm.colors).map((v) => String(v).toLowerCase()).filter((v) => v.startsWith('#')));
// literal hexes the system itself uses: header/lang colours are tokens; logo svg colours in favicon are palette too.

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const src = walk(path.join(root, 'src'));
const styleLike = src.filter((f) => /\.(css|astro)$/.test(f));
const dist = walk(path.join(root, 'dist'));
const distCss = dist.filter((f) => f.endsWith('.css'));
const distHtml = dist.filter((f) => f.endsWith('.html'));

const ALLOWED_BP = new Set([639, 640, 959, 960, 1199, 1200]);

const checkStyle = (file, text) => {
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    // SVG ids and anchors like href="#work" are not colours: only look inside style-ish contexts
    const ctx = text.slice(Math.max(0, m.index - 40), m.index);
    if (/(href|id|for|aria-[a-z]+|data-[a-z-]+)\s*=\s*["']$/.test(ctx) || /url\($/.test(ctx)) continue;
    if (!/[:(,\s]$/.test(ctx) && !/fill|stroke|color|background|border|outline/.test(ctx)) continue;
    const hex = m[0].toLowerCase();
    const full = hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex;
    if (!palette.has(full) && !palette.has(hex)) bad(file, `hex ${m[0]} is not in the DESIGN.md palette`);
  }
  if (/gradient\(/i.test(text)) bad(file, 'gradient( is banned');
  if (/backdrop-filter/i.test(text)) bad(file, 'backdrop-filter is banned');
  if (/filter\s*:\s*blur/i.test(text)) bad(file, 'filter: blur is banned');
  for (const m of text.matchAll(/box-shadow\s*:[^;}]*/gi)) {
    const line = text.slice(text.lastIndexOf('\n', m.index) + 1, text.indexOf('\n', m.index));
    // minified css loses the comment, so the ring spacer is also recognised by its exact value
    if (/box-shadow\s*:\s*0 0 0 var\(--ring-offset\) var\(--ring-ground\)\s*$/i.test(m[0].trim())) continue;
    if (!/ring-utility/.test(line) &&!/ring-utility/.test(text.slice(m.index, m.index + 160))) bad(file, `box-shadow outside the ring utility: ${m[0].trim()}`);
  }
  for (const m of text.matchAll(/@media[^{]*/g)) {
    for (const w of m[0].matchAll(/(?:min|max)-width\s*:\s*(\d+(?:\.\d+)?)px/g)) {
      if (!ALLOWED_BP.has(Number(w[1]))) bad(file, `@media width ${w[1]}px (allowed 640/960/1200 and 639/959/1199)`);
    }
  }
};

for (const f of styleLike) {
  const text = fs.readFileSync(f, 'utf8');
  if (f.endsWith('tokens.css') || f.endsWith('.astro') || f.endsWith('.css')) checkStyle(f, f.endsWith('.astro') ? (text.match(/<style[\s\S]*?<\/style>/g) || []).join('\n') + (text.match(/style="[^"]*"/g) || []).join('\n') : text);
}
for (const f of distCss) checkStyle(f, fs.readFileSync(f, 'utf8'));

for (const f of src) {
  const text = fs.readFileSync(f, 'utf8');
  if (/\.avif/i.test(text)) bad(f, '.avif is banned');
  if (/\bhref="\//.test(text) || /\bsrc="\//.test(text)) bad(f, 'hardcoded href="/ or src="/ (use withBase)');
  if (f.includes(`${path.sep}src${path.sep}scripts${path.sep}`)) {
    if (/\bfetch\(/.test(text)) bad(f, 'fetch( is banned (file://)');
    if (/\bautoAlpha\b/.test(text)) bad(f, 'autoAlpha is banned');
    if (/\bvisibility\s*:/.test(text)) bad(f, 'visibility: in scripts is banned');
    if (/\bnew\s+Worker\b|\bimport\(/.test(text)) bad(f, 'dynamic import / worker would break the single IIFE');
  }
}

for (const f of distHtml) {
  const text = fs.readFileSync(f, 'utf8');
  if (/<script[^>]*type=["']module["']/i.test(text)) bad(f, 'type="module" script');
  if (/fonts\.googleapis|fonts\.gstatic/i.test(text)) bad(f, 'Google Fonts reference');
  for (const m of text.matchAll(/<script[^>]*\ssrc="(https?:)?\/\/[^"]+"/gi)) bad(f, `third-party script origin ${m[0]}`);
  for (const m of text.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(https?:)?\/\/[^"]+"/gi)) bad(f, `third-party stylesheet origin ${m[0]}`);
}
for (const f of dist.filter((x) => x.endsWith('.avif'))) bad(f, '.avif in build output');

if (problems.length) {
  console.error(`\ncheck-tokens: ${problems.length} problem(s)\n`);
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}
console.log(`check-tokens ok: ${styleLike.length} style files, ${src.length} src files, ${distCss.length} css + ${distHtml.length} html in dist`);
