// dist-file/ over file://: the page scripts run (html[data-js=ready]), fonts load, the language toggle lands on the
// other language, internal links resolve to index.html, and nothing 404s or throws. PHASE 7 adds frame/matte scenarios.
// Usage: node qa/file-url.mjs [--shots <dir>] [--prefix 06-]
import path from 'node:path';
import { launch, watch, shot, sleep, fileUrl, siteRoot, realClick } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const shots = arg('shots', '');
const prefix = arg('prefix', '');
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ' ' + extra : ''}`); };

const browser = await launch({ fileAccess: true });

async function open(rel, size) {
  const page = await browser.newPage();
  await page.setViewport({ width: size.w, height: size.h, isMobile: size.w < 640, hasTouch: size.w < 640 });
  const log = watch(page);
  await page.goto(fileUrl(rel), { waitUntil: 'load' });
  await sleep(1400);
  return { page, log };
}

for (const size of [{ w: 1440, h: 900 }, { w: 390, h: 844 }]) {
  for (const rel of ['index.html', 'de/index.html', 'cv/index.html']) {
    const { page, log } = await open(rel, size);
    const s = await page.evaluate(() => ({
      js: document.documentElement.dataset.js,
      lang: document.documentElement.lang,
      base: document.documentElement.dataset.base,
      fonts: ['900 40px Archivo', '500 13px Inter', '400 20px Newsreader'].map((f) => document.fonts.check(f)),
      loaderGone: !document.querySelector('[data-loader]'),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    const tag = `${rel} @${size.w}`;
    check(`${tag}: site.js ran (data-js=ready)`, s.js === 'ready');
    check(`${tag}: no console errors, no failed requests`, !log.errors.length && !log.failed.length, [...log.errors, ...log.failed].join(' | '));
    check(`${tag}: no horizontal overflow`, s.overflow <= 0, String(s.overflow));
    if (size.w === 1440) check(`${tag}: loader curtain gone after 1.4 s`, s.loaderGone);
    if (shots) await shot(page, path.join(siteRoot, shots, `${prefix}file-${rel.replace(/[\/]/g, '-').replace('-index.html', '').replace('.html', '')}-${size.w}.png`));
    await page.close();
  }
}

// language toggle from disk: home EN -> DE keeps working, hash survives
{
  const { page } = await open('index.html', { w: 1440, h: 900 });
  await page.evaluate(() => { location.hash = '#work'; });
  await realClick(page, 'a.lang__seg[hreflang="de"]');
  await sleep(600);
  const u = await page.evaluate(() => ({ href: location.href, lang: document.documentElement.lang }));
  check('file://: EN -> DE toggle lands on de/index.html with hash', /de\/index\.html#work$/.test(u.href) && u.lang.startsWith('de'), u.href);
  await page.close();
}
// legacy redirect from disk
{
  const page = await browser.newPage();
  await page.goto(fileUrl('cv.html') + '#vault', { waitUntil: 'load' });
  await sleep(600);
  const u = page.url();
  check('file://: cv.html#vault redirects to cv/index.html#vault', /cv\/index\.html#vault$/.test(u), u);
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
