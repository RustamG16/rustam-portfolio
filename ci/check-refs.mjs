/* Pre-deploy reference check, ported to the built output.
 *
 * Walks every HTML file under dist/ (or dist-file/) and asserts that each LOCAL thing it points at exists:
 * href / src / srcset / poster / data-* media paths, CSS url(), and in-page / cross-page #anchors.
 * The public base ("/rustam-portfolio/") is stripped before resolving. Absolute https URLs are skipped on
 * purpose: a deploy gate that goes red when someone else's server is down gets ignored within a week.
 *
 * Asset-set completeness (hero frames 180 + 90 + 2 mattes, six works' film + poster, both OG images) is
 * reported as "pending" while the producing phase has not delivered, and fails under --strict-assets.
 *
 * Usage: node ci/check-refs.mjs [dist] [--strict-assets]      Exit: 0 clean, 1 if anything is broken.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const strict = args.includes('--strict-assets');
const ROOT = path.resolve(args.find((a) => !a.startsWith('--')) || 'dist');
const BASE = '/rustam-portfolio/';
if (!fs.existsSync(ROOT)) {
  console.error(`check-refs: ${ROOT} does not exist. Run the build first.`);
  process.exit(1);
}

const problems = [];
const pending = [];
const checked = new Set();
const idCache = new Map();

const listFiles = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else out.push(p);
  }
  return out;
};

const isExternal = (u) =>
  !u || /^(https?:)?\/\//i.test(u) || /^(mailto|tel|data|javascript|blob):/i.test(u) || u.startsWith('%23');

const fileOfUrl = (abs) => {
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) return path.join(abs, 'index.html');
  return abs;
};

const idsOf = (htmlFile) => {
  if (!idCache.has(htmlFile)) {
    const src = fs.readFileSync(htmlFile, 'utf8');
    idCache.set(htmlFile, new Set([...src.matchAll(/\sid\s*=\s*"([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(htmlFile);
};

function verify(ref, fromFile) {
  if (isExternal(ref)) return;
  const [pathAndQuery, hash = ''] = ref.split('#');
  const rel = pathAndQuery.split('?')[0];
  let abs;
  if (!rel) abs = fromFile; // pure #hash: same page
  else if (rel.startsWith(BASE)) abs = path.join(ROOT, rel.slice(BASE.length));
  else if (rel.startsWith('/')) {
    problems.push(`${path.relative(ROOT, fromFile)} -> ${ref} (root-relative outside ${BASE})`);
    return;
  } else abs = path.resolve(path.dirname(fromFile), rel);

  const key = abs + '#' + hash + '<-' + fromFile;
  if (checked.has(key)) return;
  checked.add(key);

  const target = fileOfUrl(abs);
  if (!fs.existsSync(target)) {
    problems.push(`${path.relative(ROOT, fromFile)} -> ${ref}`);
    return;
  }
  if (hash && target.endsWith('.html') && hash !== 'top' && !idsOf(target).has(hash)) {
    problems.push(`${path.relative(ROOT, fromFile)} -> ${ref} (no id="${hash}" in ${path.relative(ROOT, target)})`);
  }
}

const files = listFiles(ROOT);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

for (const f of htmlFiles) {
  const src = fs.readFileSync(f, 'utf8');
  /* The leading \s is load-bearing: \b would also match the "src" inside data-cap-src. */
  for (const m of src.matchAll(/\s(?:href|src|poster|data-base|data-src|data-poster|data-film|data-video|data-preview|data-pdf)\s*=\s*"([^"]*)"/g)) {
    if (m[0].trimStart().startsWith('data-base')) continue; // a directory prefix, verified through its use
    verify(m[1], f);
  }
  /* url() inside inline <style> blocks (the font faces are inlined by Base.astro) */
  for (const st of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const m of st[1].matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) verify(m[1], f);
  }
  for (const m of src.matchAll(/\ssrcset\s*=\s*"([^"]*)"/g)) {
    m[1].split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean).forEach((s) => verify(s, f));
  }
}

for (const f of files.filter((x) => x.endsWith('.css'))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) verify(m[1], f);
}

/* Asset sets produced by other phases */
const need = (label, rels, phase) => {
  const missing = rels.filter((r) => !fs.existsSync(path.join(ROOT, r)));
  if (!missing.length) return;
  const msg = `${label}: ${missing.length} of ${rels.length} missing (first: ${missing[0]}) [${phase}]`;
  (strict ? problems : pending).push(msg);
};
const pad = (i) => String(i).padStart(4, '0');
need('hero desktop frames', [...Array.from({ length: 180 }, (_, i) => `frames/hero/desktop/frame_${pad(i + 1)}.jpg`), 'frames/hero/desktop/matte.webp'], 'phase 4');
need('hero phone frames', [...Array.from({ length: 90 }, (_, i) => `frames/hero/phone/frame_${pad(i + 1)}.jpg`), 'frames/hero/phone/matte.webp'], 'phase 4');
need('works films + posters', ['convenium', 'meridian', 'sonnwerk', 'wild-gruppe', 'savra', 'doko'].flatMap((s) => [`works/${s}/film.mp4`, `works/${s}/poster.jpg`]), 'phase 5');
need('OG images', ['og/home.jpg', 'og/cv.jpg'], 'phase 5');

if (problems.length) {
  console.error(`\nBROKEN REFERENCES (${problems.length}):\n`);
  problems.forEach((p) => console.error('  ' + p));
  console.error('');
  process.exit(1);
}
pending.forEach((p) => console.log('  pending: ' + p));
console.log(`refs ok: ${checked.size} local references across ${htmlFiles.length} pages${pending.length ? ` (${pending.length} asset set(s) pending)` : ''}`);
