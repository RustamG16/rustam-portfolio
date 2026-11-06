// Port of .olympus/copy/check-copy.mjs (phase 3): reads src/content/, PDF sizes from public/. Do not weaken.
// node .olympus/copy/check-copy.mjs  — parse, key-tree parity, locked facts, banned words, meta lengths.
// Exit 1 on any failure. Reusable by phase 8 once the JSON lives in src/content/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/content');
const site = path.resolve(dir, '../../public');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const facts = load('facts.json');
const copy = { en: load('copy.en.json'), de: load('copy.de.json') };
const errors = [];
const fail = (m) => errors.push(m);

// 1 — key trees identical (objects by key set, arrays by length)
const shape = (v, p = '') =>
  Array.isArray(v) ? [`${p}[${v.length}]`, ...v.flatMap((x, i) => shape(x, `${p}[${i}]`))]
  : v && typeof v === 'object' ? Object.keys(v).sort().flatMap((k) => [`${p}.${k}`, ...shape(v[k], `${p}.${k}`)])
  : [];
const [se, sd] = [new Set(shape(copy.en)), new Set(shape(copy.de))];
for (const k of se) if (!sd.has(k)) fail(`key only in EN: ${k}`);
for (const k of sd) if (!se.has(k)) fail(`key only in DE: ${k}`);

// helpers
const strings = (v) => Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : typeof v === 'string' ? [v] : [];
const L = (x, lang) => (x && typeof x === 'object' && !Array.isArray(x) && (lang in x) ? x[lang] : x);
const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${what}: ${JSON.stringify(a)} ≠ fact ${JSON.stringify(b)}`); };
const has = (lang, s, what) => { if (!strings(copy[lang]).some((x) => x.includes(s))) fail(`[${lang}] fact missing (${what}): "${s}"`); };
const countries = { en: {}, de: {} };

for (const lang of ['en', 'de']) {
  const c = copy[lang];
  const cv = c.cv;
  // identity
  for (const s of [facts.identity.name.value, facts.identity.wordmark.value, facts.identity.origin.value,
    facts.identity.station.value, facts.identity.period.value, facts.identity.status[lang],
    facts.identity.availability[lang], facts.site.copyright, facts.identity.fileId.value]) has(lang, s, 'identity');
  eq(cv.cover.roles.map((r) => r.toUpperCase()), facts.identity.roleWords.value, `[${lang}] cv.cover.roles`);
  eq(cv.cover.rolesAria.split(', '), lang === 'en' ? facts.identity.titles.value.map(x=>x) : facts.identity.titles.de, `[${lang}] cv.cover.rolesAria`);
  // stats (home + cv)
  for (const st of facts.stats.items) for (const blk of [c.statement.stats, cv.vitals.stats]) {
    eq([blk[st.id].value, blk[st.id].suffix, blk[st.id].label], [st.value, st.suffix, st[lang]], `[${lang}] stat ${st.id}`);
  }
  // experience (cv = full, home teaser = subset)
  for (const r of facts.experience.roles) {
    const x = cv.experience.roles[r.id];
    const city = `${r.city}, ${r.country[lang]}`;
    eq([x.from, x.to, x.duration, x.role, x.employer, x.city], [r.from, r.to, r.duration[lang], r.role, r.employer, city], `[${lang}] cv role ${r.id}`);
    eq(x.bullets, r.bullets[lang], `[${lang}] cv role ${r.id} bullets`);
    eq(x.tags, L(r.tags, lang), `[${lang}] cv role ${r.id} tags`);
    if (r.award) eq(x.award.label, r.award.value, `[${lang}] award`);
    const t = c.experience.roles[r.id];
    const years = r.from === r.to ? r.from : `${r.from} — ${r.to}`;
    eq([t.years, t.duration, t.role, t.employer, t.city], [years, r.duration[lang], r.role, r.employer, city], `[${lang}] teaser role ${r.id}`);
  }
  eq(c.experience.award, facts.experience.roles[0].award.value, `[${lang}] teaser award`);
  // education
  for (const d of facts.education.degrees) {
    const x = cv.education.degrees[d.id];
    eq([x.years, x.title, x.institution, x.city], [`${d.from} — ${L(d.to, lang)}`, d.title, d.institution, `${d.city}, ${d.country[lang]}`], `[${lang}] degree ${d.id}`);
  }
  // languages
  for (const it of facts.languages.items) eq(Object.values(cv.languages.items[it.id]), [it[lang], it.native, L(it.level, lang)], `[${lang}] language ${it.id}`);
  eq(cv.languages.order, facts.languages.items.map((i) => i.id), `[${lang}] language order`);
  // capability table
  for (const g of facts.capabilities.groups) {
    const x = cv.capabilities.groups[g.id];
    eq(x.title, g[lang], `[${lang}] cap group ${g.id}`);
    eq(x.rows, g.rows.map((r) => ({ label: r.label[lang], where: r.where === 'self' ? facts.capabilities.selfDirected[lang] : r.where })), `[${lang}] cap rows ${g.id}`);
  }
  eq(c.capability.also.items, facts.capabilities.homeStrip[lang], `[${lang}] capability strip`);
  // documents
  for (const d of facts.documents.items) {
    const x = cv.documents.items[d.id];
    eq([x.title, x.desc], [d.title[lang], d.desc[lang]], `[${lang}] doc ${d.id}`);
    const pg = lang === 'en' ? (d.pages === 1 ? '1 page' : `${d.pages} pages`) : (d.pages === 1 ? '1 Seite' : `${d.pages} Seiten`);
    eq(x.meta, `PDF · ${pg} · ${d.sizeKB} KB`, `[${lang}] doc meta ${d.id}`);
  }
  eq(cv.documents.order, facts.documents.order, `[${lang}] doc order`);
  // contact
  const ch = c.contact.channels, fc = facts.contact;
  eq([ch.email.value, ch.email.href, ch.linkedin.href, ch.instagram.href, ch.whatsapp.href, ch.whatsapp.aria],
     [fc.email.value, fc.email.href, fc.linkedin.href, fc.instagram.href, fc.whatsapp.href, fc.whatsapp.aria[lang]], `[${lang}] contact`);
  // legal (verbatim reference)
  eq([c.legal.title, c.legal.description, c.legal.back, c.legal.footerLabel], [facts.legal.title, facts.legal.description, facts.legal.backLink, facts.legal.footerLabel[lang]], `[${lang}] legal`);
  eq([c.meta.legal.title, c.meta.legal.description], [facts.legal.title, facts.legal.description], `[${lang}] meta.legal`);
  eq([c.meta.ogLocale, c.meta.ogLocaleAlternate], lang === 'en' ? [facts.site.ogLocale, facts.site.ogLocaleAlternate] : [facts.site.ogLocaleAlternate, facts.site.ogLocale], `[${lang}] og locale`);
  // works
  eq(c.works.order, facts.works.order, `[${lang}] works order`);
  for (const w of facts.works.items) {
    const x = c.works.items[w.id];
    eq([x.name, x.sector, x.href, x.tags], [w.name, w.status[lang], w.url, w.tags], `[${lang}] work ${w.id}`);
    for (const s of w.check?.[lang] ?? []) if (!x.line.includes(s)) fail(`[${lang}] work ${w.id} line lost "${s}"`);
    if (/commission|client|kunde|auftrag/i.test(x.line + x.sector)) fail(`[${lang}] work ${w.id} implies client work`);
  }
  // banned words (locked fact strings exempt)
  const locked = new Set(facts.experience.roles.flatMap((r) => r.bullets[lang]));
  for (const s of strings(c)) if (!locked.has(s) && /passionate|solutions?\b|leidenschaft|lösung/i.test(s)) fail(`[${lang}] banned word: "${s}"`);
  // meta lengths
  for (const [k, m] of Object.entries(c.meta)) if (m && typeof m === 'object') for (const f of ['description', 'ogDescription'])
    if (m[f] && m[f].length > 160) fail(`[${lang}] meta.${k}.${f} is ${m[f].length} chars (>160)`);
}

// document sizes / CV pdf against disk
for (const d of facts.documents.items) {
  const p = path.join(site, d.pdf);
  if (!fs.existsSync(p)) { fail(`missing ${d.pdf}`); continue; }
  const b = fs.statSync(p).size;
  if (b !== d.bytes || Math.round(b / 1024) !== d.sizeKB) fail(`${d.pdf}: ${b} B on disk vs fact ${d.bytes} B / ${d.sizeKB} KB`);
}
if (fs.statSync(path.join(site, facts.cvPdf.path)).size !== facts.cvPdf.bytes) fail('cv pdf size changed');

const n = se.size;
if (errors.length) { console.error(errors.join('\n')); console.error(`\nFAIL — ${errors.length} problem(s)`); process.exit(1); }
console.log(`OK — both files parse, ${n} key paths identical EN/DE, facts hold, no banned words, meta ≤160.`);
for (const lang of ['en', 'de']) for (const [k, m] of Object.entries(copy[lang].meta)) if (m?.description) console.log(`  [${lang}] meta.${k}: title ${m.title.length} · desc ${m.description.length}${m.ogDescription ? ' · og ' + m.ogDescription.length : ''}`);
