/* Pre-deploy reference check.
 *
 * Walks every HTML file in the site and asserts that each LOCAL thing it points
 * at actually exists on disk. This repo's characteristic failure is a renamed or
 * moved asset — the hero strip changing format, the shots folder appearing, two
 * preview clips being retired — and the symptom is always the same: a silently
 * broken page in production that looked fine locally because the old file was
 * still sitting in the working tree.
 *
 * It also scans main.js / cv.js for hardcoded media paths, because a good half
 * of this site's assets are referenced from JS rather than markup.
 *
 * Deliberately NOT a link checker for external URLs: those fail for reasons
 * that have nothing to do with the commit being deployed, and a deploy gate
 * that goes red when someone else's server is down gets ignored within a week.
 *
 * Usage:  node ci/check-refs.mjs        (run from the site root)
 * Exit:   0 clean, 1 if anything is missing.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const problems = [];
const checked = new Set();

const listFiles = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else out.push(p);
  }
  return out;
};

const isExternal = (u) =>
  !u ||
  /^(https?:)?\/\//i.test(u) ||
  /^(mailto|tel|data|javascript|blob):/i.test(u) ||
  u.startsWith('#') ||
  /* %23 is an encoded '#'. It shows up as url(%23p) inside the data: URIs the
     stylesheets use for inline SVG filters — a fragment reference into the SVG
     itself, not a file. */
  u.startsWith('%23');

/* strip the ?v= cache-buster and any fragment before hitting the filesystem */
const clean = (u) => u.split('#')[0].split('?')[0];

function verify(ref, fromFile) {
  if (isExternal(ref)) return;
  const rel = clean(ref);
  if (!rel) return;
  const abs = rel.startsWith('/')
    ? path.join(ROOT, rel.slice(1))
    : path.resolve(path.dirname(fromFile), rel);
  const key = abs + '<-' + fromFile;
  if (checked.has(key)) return;
  checked.add(key);
  if (!fs.existsSync(abs)) {
    problems.push(`${path.relative(ROOT, fromFile)} -> ${ref}`);
  }
}

const files = listFiles(ROOT);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

for (const f of htmlFiles) {
  const src = fs.readFileSync(f, 'utf8');
  /* href/src/poster on any tag, plus the data-* attributes this site uses to
     carry media paths (data-video, data-preview, data-poster, data-clip,
     data-pdf) and the comma-separated data-shots list. */
  /* The leading \s is load-bearing, not tidiness: \b also matches the "src"
     inside data-cap-src="LIVE", and LIVE is a caption string, not a path. */
  for (const m of src.matchAll(/\s(?:href|src|poster|data-video|data-preview|data-poster|data-clip|data-pdf)\s*=\s*"([^"]*)"/g)) {
    verify(m[1], f);
  }
  for (const m of src.matchAll(/\sdata-shots\s*=\s*"([^"]*)"/g)) {
    m[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => verify(s, f));
  }
  for (const m of src.matchAll(/\ssrcset\s*=\s*"([^"]*)"/g)) {
    m[1].split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean).forEach((s) => verify(s, f));
  }
}

/* url() in stylesheets — this is how the self-hosted @font-face block is
   referenced, and a typo there degrades silently to a fallback font. */
for (const f of files.filter((x) => x.endsWith('.css'))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) verify(m[1], f);
}

/* string literals in JS that look like a path into a known asset folder */
for (const f of files.filter((x) => x.endsWith('.js') && !x.includes(`${path.sep}ci${path.sep}`))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/['"`]((?:media|frames|fonts|assets)\/[^'"`\s)]+)['"`]/g)) {
    /* skip templated paths. main.js builds each frame url by concatenating
       'frames/hero/frame_' + a padded index + an extension, so the literal on
       its own is a prefix rather than a file. Anything without an extension in
       its last segment is one of these. The strip is verified as a whole
       further down instead. */
    if (m[1].includes('${')) continue;
    if (!/\.[a-z0-9]{2,5}$/i.test(m[1])) continue;
    verify(m[1], f);
  }
}

/* the hero flipbook is built by index, not written out: assert the strip is
   complete rather than trusting that frame_0001 existing means all of them do */
const FRAMES = path.join(ROOT, 'frames', 'hero');
if (fs.existsSync(FRAMES)) {
  const jpgs = fs.readdirSync(FRAMES).filter((n) => n.endsWith('.jpg'));
  const declared = (() => {
    const js = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
    const m = js.match(/desktop:\s*\{[^}]*count:\s*(\d+)/);
    return m ? Number(m[1]) : null;
  })();
  if (declared && jpgs.length !== declared) {
    problems.push(`frames/hero: main.js declares ${declared} frames, found ${jpgs.length} .jpg`);
  }
  for (let i = 1; i <= (declared || 0); i++) {
    const n = String(i).padStart(4, '0');
    if (!fs.existsSync(path.join(FRAMES, `frame_${n}.jpg`))) {
      problems.push(`frames/hero/frame_${n}.jpg missing`);
      break; /* one is enough to fail the build; don't print 180 lines */
    }
  }
}

if (problems.length) {
  console.error(`\nBROKEN REFERENCES (${problems.length}):\n`);
  problems.forEach((p) => console.error('  ' + p));
  console.error('');
  process.exit(1);
}
console.log(`refs ok — ${checked.size} local references across ${htmlFiles.length} pages`);
