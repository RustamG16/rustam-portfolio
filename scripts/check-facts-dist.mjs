// Gate: every locked fact in src/content/facts.json appears in the BUILT html of the page PRODUCT.md puts it on,
// in EN and DE. Reads dist/ (run `npm run build` first; `npm run check` does). Also asserts the banned words are
// nowhere in any built page. Exit 1 on any difference.
//   node scripts/check-facts-dist.mjs [distDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(root, process.argv[2] || 'dist');
const facts = JSON.parse(fs.readFileSync(path.join(root, 'src/content/facts.json'), 'utf8'));

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error(`check-facts-dist: no build at ${dist} (run npm run build)`);
  process.exit(1);
}

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
const norm = (s) => s.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Visible text of a built page: scripts, styles, <template> and hidden SVG text removed, tags -> spaces. */
function pageText(html) {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ');
  return norm(decode(body.replace(/<[^>]+>/g, ' ')));
}

const pages = {};
const load = (id, rel) => {
  const f = path.join(dist, rel);
  if (!fs.existsSync(f)) {
    console.error(`check-facts-dist: missing ${rel}`);
    process.exit(1);
  }
  const html = fs.readFileSync(f, 'utf8');
  pages[id] = { rel, html, raw: decode(html), text: pageText(html) };
};
load('home-en', 'index.html');
load('home-de', 'de/index.html');
load('cv-en', 'cv/index.html');
load('cv-de', 'de/cv/index.html');

const fails = [];
let checked = 0;
const L = (x, lang) => (x && typeof x === 'object' && !Array.isArray(x) && lang in x ? x[lang] : x);

function text(id, s, what) {
  checked++;
  if (!pages[id].text.includes(norm(s))) fails.push(`[${id}] ${what}: "${s}" not in visible text`);
}
function raw(id, s, what) {
  checked++;
  if (!pages[id].raw.includes(s)) fails.push(`[${id}] ${what}: "${s}" not in html`);
}
const pdfLabel = (d, lang) => `PDF · ${d.pages === 1 ? (lang === 'en' ? '1 page' : '1 Seite') : lang === 'en' ? `${d.pages} pages` : `${d.pages} Seiten`} · ${d.sizeKB} KB`;

for (const lang of ['en', 'de']) {
  const home = `home-${lang}`;
  const cv = `cv-${lang}`;

  // ---- identity, on both pages ----
  for (const id of [home, cv]) {
    text(id, facts.identity.name.value, 'identity name');
    raw(id, facts.cvPdf.path, 'CV PDF path');
    raw(id, facts.cvPdf.downloadName, 'CV PDF download name');
    raw(id, facts.contact.email.href, 'email href');
    text(id, facts.site.copyright, 'copyright');
    for (const s of facts.stats.items) {
      text(id, s[lang], `stat label ${s.id}`);
      text(id, `${s.value}${s.suffix}`, `stat figure ${s.id}`);
    }
  }
  text(home, facts.identity.wordmark.value, 'wordmark');
  text(home, facts.identity.availability[lang], 'availability');
  text(home, facts.identity.status[lang].split(' · ')[0], 'status location');

  // ---- home: six works with state labels, the four channels, the experience teaser ----
  for (const w of facts.works.items) {
    text(home, w.name, `work name ${w.id}`);
    const status = w.status[lang] ?? w.status.en;
    const cut = status.indexOf(' · ');
    text(home, status.slice(0, cut), `work sector ${w.id}`);
    text(home, status.slice(cut + 3), `work state label ${w.id}`);
    raw(home, `href="${w.url}"`, `work url ${w.id}`);
  }
  const c = facts.contact;
  raw(home, c.email.href, 'channel email');
  raw(home, c.linkedin.href, 'channel linkedin');
  raw(home, c.instagram.href, 'channel instagram');
  raw(home, c.whatsapp.href, 'channel whatsapp');
  text(home, c.email.value, 'channel email value');
  text(home, c.linkedin.label, 'channel linkedin label');
  text(home, c.instagram.label, 'channel instagram label');
  text(home, c.whatsapp.label, 'channel whatsapp label');
  raw(home, `aria-label="${c.whatsapp.aria[lang]}"`, 'whatsapp aria');
  for (const r of facts.experience.roles) {
    const years = r.from === r.to ? r.from : `${r.from} — ${r.to}`;
    text(home, years, `teaser years ${r.id}`);
    text(home, r.duration[lang], `teaser duration ${r.id}`);
    text(home, r.role, `teaser role ${r.id}`);
    text(home, r.employer, `teaser employer ${r.id}`);
    text(home, `${r.city}, ${r.country[lang]}`, `teaser city ${r.id}`);
  }
  text(home, facts.experience.roles[0].award.value, 'teaser award');

  // ---- CV: roles, dates, durations, degrees, languages, capabilities, documents with sizes ----
  text(cv, facts.identity.origin.value, 'cover origin');
  text(cv, facts.identity.station.value, 'cover station');
  text(cv, facts.identity.period.value, 'cover period');
  text(cv, facts.identity.status[lang], 'vitals status');
  checked++;
  if (!new RegExp(`${facts.counts.roles} \\S+ · ${facts.counts.degrees} \\S+ · ${facts.counts.documents} \\S+`).test(pages[cv].text)) fails.push(`[${cv}] cover contents: "${facts.counts.roles} · ${facts.counts.degrees} · ${facts.counts.documents}" counts line missing`);
  for (const r of facts.experience.roles) {
    const years = r.from === r.to ? r.from : `${r.from} — ${r.to}`;
    text(cv, years, `role years ${r.id}`);
    text(cv, r.duration[lang], `role duration ${r.id}`);
    text(cv, r.role, `role ${r.id}`);
    text(cv, r.employer, `employer ${r.id}`);
    text(cv, `${r.city}, ${r.country[lang]}`, `city ${r.id}`);
    for (const b of r.bullets[lang]) text(cv, b, `bullet ${r.id}`);
    for (const tag of L(r.tags, lang)) text(cv, tag, `tag ${r.id}`);
  }
  text(cv, facts.experience.roles[0].award.value, 'award label');
  raw(cv, 'href="#doc-knime"', 'award link to #doc-knime');
  for (const d of facts.education.degrees) {
    text(cv, `${d.from} — ${L(d.to, lang)}`, `degree years ${d.id}`);
    text(cv, d.title, `degree ${d.id}`);
    text(cv, d.institution, `institution ${d.id}`);
    text(cv, `${d.city}, ${d.country[lang]}`, `degree city ${d.id}`);
  }
  for (const it of facts.languages.items) {
    text(cv, it[lang], `language ${it.id}`);
    text(cv, it.native, `language native ${it.id}`);
    text(cv, L(it.level, lang), `language level ${it.id}`);
  }
  for (const g of facts.capabilities.groups) {
    text(cv, g[lang], `capability group ${g.id}`);
    for (const row of g.rows) {
      text(cv, row.label[lang], `capability ${g.id}`);
      text(cv, row.where === 'self' ? facts.capabilities.selfDirected[lang] : row.where, `capability where ${g.id}`);
    }
  }
  for (const d of facts.documents.items) {
    text(cv, d.title[lang], `document title ${d.id}`);
    text(cv, d.desc[lang], `document desc ${d.id}`);
    text(cv, pdfLabel(d, lang), `document size ${d.id}`);
    raw(cv, d.pdf, `document pdf ${d.id}`);
    raw(cv, d.preview, `document scan ${d.id}`);
    raw(cv, `id="doc-${d.id}"`, `document anchor ${d.id}`);
  }
}

// ---- banned words: nowhere, in any built page (all languages) ----
const banned = ['commissioned', 'client', 'passionate', 'solutions'];
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.html') ? [p] : [];
  });
let pagesScanned = 0;
for (const f of walk(dist)) {
  pagesScanned++;
  const html = fs.readFileSync(f, 'utf8');
  // visible text AND attributes, but not the client script bundle (not html) and not the DE legal body, which is Russ's
  // own wording and quotes statutory text ("Kunden" is German; none of these English words occur there either way).
  const hay = decode(html.replace(/<script[\s\S]*?<\/script>/gi, ' ')).toLowerCase();
  for (const w of banned) {
    checked++;
    if (hay.includes(w)) fails.push(`[${path.relative(dist, f)}] banned word "${w}" appears`);
  }
}

if (fails.length) {
  console.error(`check-facts-dist: ${fails.length} difference(s) in ${checked} checks`);
  fails.forEach((f) => console.error('  ' + f));
  process.exit(1);
}
console.log(`check-facts-dist: ok, 0 differences, ${checked} checks over ${Object.keys(pages).length} routes (EN+DE) + banned words on ${pagesScanned} built pages`);
