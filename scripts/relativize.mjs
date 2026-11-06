// dist-file/ -> file://-safe URLs. Run by `npm run build:file` after `FILE_BUILD=1 astro build` (base '/').
//  - In every .html: root-relative values of href, src, srcset, poster, data-base, data-src, data-poster, data-film
//    and url(/...) in inline styles become paths relative to that file. A directory (or trailing '/') gets
//    index.html appended. ?query and #hash are kept.
//  - In every .css: url(/...) becomes relative to the css file.
//  - Absolute https: URLs (canonical, OG, hreflang, external links) are left alone.
//  - Exit 1 if any root-relative URL survives.
// Usage: node scripts/relativize.mjs dist-file
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] || 'dist-file');
if (!fs.existsSync(dist)) {
  console.error(`relativize: ${dist} does not exist`);
  process.exit(1);
}

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const isRootRel = (v) => v.startsWith('/') && !v.startsWith('//');

function rel(fromFile, value, { asBase = false } = {}) {
  const m = value.match(/^([^?#]*)([?#].*)?$/);
  let p = m[1];
  const tail = m[2] || '';
  const fromDir = path.dirname(fromFile);
  const target = path.join(dist, p.replace(/^\/+/, ''));
  let r = path.relative(fromDir, target).split(path.sep).join('/');
  const isDir = p.endsWith('/') || (fs.existsSync(target) && fs.statSync(target).isDirectory());
  if (asBase) {
    r = r === '' ? './' : r + '/';
    return r;
  }
  if (isDir) r = (r === '' ? '' : r + '/') + 'index.html';
  if (r === '') r = path.basename(fromFile);
  if (!r.startsWith('.') ) r = './' + r;
  return r + tail;
}

const ATTRS = ['href', 'src', 'poster', 'data-base', 'data-src', 'data-poster', 'data-film'];
let changed = 0;
const leftovers = [];

for (const file of walk(dist)) {
  if (file.endsWith('.html')) {
    let html = fs.readFileSync(file, 'utf8');
    const before = html;
    for (const a of ATTRS) {
      html = html.replace(new RegExp(String.raw`(\s${a}\s*=\s*")([^"]*)(")`, 'g'), (all, pre, v, post) =>
        isRootRel(v) ? pre + rel(file, v, { asBase: a === 'data-base' }) + post : all,
      );
    }
    html = html.replace(/(\ssrcset\s*=\s*")([^"]*)(")/g, (all, pre, v, post) => {
      const out = v
        .split(',')
        .map((part) => {
          const [u, ...d] = part.trim().split(/\s+/);
          return [isRootRel(u) ? rel(file, u) : u, ...d].join(' ');
        })
        .join(', ');
      return pre + out + post;
    });
    html = html.replace(/url\(\s*(['"]?)(\/[^'")]*)\1\s*\)/g, (all, q, u) => (isRootRel(u) ? `url(${q}${rel(file, u)}${q})` : all));
    if (html !== before) {
      fs.writeFileSync(file, html);
      changed++;
    }
    for (const a of [...ATTRS, 'srcset']) {
      for (const m of html.matchAll(new RegExp(String.raw`\s${a}\s*=\s*"([^"]*)"`, 'g'))) {
        if (a === 'srcset') {
          m[1].split(',').forEach((part) => {
            const u = part.trim().split(/\s+/)[0];
            if (isRootRel(u)) leftovers.push(`${path.relative(dist, file)} ${a}=${u}`);
          });
        } else if (isRootRel(m[1])) leftovers.push(`${path.relative(dist, file)} ${a}=${m[1]}`);
      }
    }
  } else if (file.endsWith('.css')) {
    let css = fs.readFileSync(file, 'utf8');
    const before = css;
    css = css.replace(/url\(\s*(['"]?)(\/[^'")]*)\1\s*\)/g, (all, q, u) => (isRootRel(u) ? `url(${q}${rel(file, u).replace(/^\.\//, '')}${q})` : all));
    if (css !== before) {
      fs.writeFileSync(file, css);
      changed++;
    }
    for (const m of css.matchAll(/url\(\s*['"]?(\/[^'")]*)['"]?\s*\)/g)) {
      if (isRootRel(m[1])) leftovers.push(`${path.relative(dist, file)} url(${m[1]})`);
    }
  }
}

if (leftovers.length) {
  console.error('relativize: root-relative URLs survived:');
  leftovers.slice(0, 30).forEach((l) => console.error('  ' + l));
  process.exit(1);
}
console.log(`relativize: ${changed} files rewritten in ${path.relative(process.cwd(), dist) || '.'}, no root-relative URL left`);
