// Generates design.json from DESIGN.md front-matter (tokens) + prose rules (narrative).
// Port of the phase-2 generator (gen-design-json.cjs). Run: node scripts/gen-design-json.mjs
// design.json is a phase-2 file; this script only regenerates it after a DESIGN.md amendment.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const md = fs.readFileSync(path.join(root, 'DESIGN.md'), 'utf8').replace(/\r\n/g, '\n');
const fm = yaml.load(md.match(/^---\n([\s\S]*?)\n---\n/)[1]);
const body = md.slice(md.indexOf('\n---\n', 4) + 5);

const rules = [...body.matchAll(/\*\*The ([^*]+?) (Rule|Exception|Note)\.\*\* ([^\n]+(?:\n(?!\n)[^\n]+)*)/g)].map((m) => ({
  name: `The ${m[1]} ${m[2]}`,
  body: m[3].replace(/\s*\n\s*/g, ' '),
}));
const sect = (h) => {
  const i = body.indexOf(`### ${h}\n`);
  if (i < 0) return [];
  const rest = body.slice(i + h.length + 5);
  const end = rest.search(/\n### |\n## /);
  return (end < 0 ? rest : rest.slice(0, end)).split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2));
};

const target = path.join(root, 'design.json');
if (!fs.existsSync(target)) {
  console.error('design.json does not exist; it is a phase-2 file. Restore it from git first.');
  process.exit(1);
}
const prev = JSON.parse(fs.readFileSync(target, 'utf8'));
const role = { noir: 'neutral', cotton: 'neutral', paper: 'neutral', ink: 'neutral', gray: 'neutral', 'gray-on-noir': 'neutral', hairline: 'neutral', cherry: 'primary', maroon: 'primary', chili: 'secondary', 'chili-300': 'secondary', wordmark: 'neutral', 'rule-on-noir': 'neutral', 'scrim-type': 'neutral' };
const colorMeta = Object.fromEntries(
  Object.entries(fm.colors).map(([k, v]) => [k, { role: role[k], displayName: k.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()), canonical: v }]),
);
// Keep every non-token field from the committed file; refresh tokens, colour meta, rules.
const out = {
  ...prev,
  tokens: fm,
  extensions: { ...prev.extensions, colorMeta, hero: fm.hero, mark: fm.mark, cursor: fm.cursor, budgets: fm.budgets },
  narrative: { ...prev.narrative, rules, dos: sect('Do'), donts: sect("Don't") },
};
fs.writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log('design.json regenerated: rules', rules.length);
