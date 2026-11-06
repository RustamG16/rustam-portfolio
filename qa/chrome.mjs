// Phase 6 chrome scenarios on the http build: loader rules, header tone, cursor, Lenis, reduced motion,
// language toggle, footer wordmark. Real mouse events only; Lenis parked before every scroll.
// Usage: node qa/chrome.mjs [--dist dist] [--shots qa/shots --prefix 06-]
import path from 'node:path';
import { serve, launch, watch, parkLenis, realClick, shot, sleep, siteRoot } from './lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > -1 ? process.argv[i + 1] : d;
};
const dist = path.resolve(siteRoot, arg('dist', 'dist'));
const shots = arg('shots', '');
const prefix = arg('prefix', '');
const results = [];
const check = (name, ok, extra = '') => {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? '  ' + extra : ''}`);
};

const server = await serve(dist);
const browser = await launch();
const newPage = async (size = { w: 1440, h: 900 }, extra = async () => {}) => {
  const page = await browser.newPage();
  await page.setViewport({ width: size.w, height: size.h, isMobile: size.w < 640, hasTouch: size.w < 640 });
  await extra(page);
  return page;
};
const tone = (page) => page.evaluate(() => document.querySelector('[data-header]').dataset.tone);
const topOf = (page, sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, sel);
const discW = (page) => page.evaluate(() => Math.round(document.querySelector('.cursor__disc').getBoundingClientRect().width));

// ---- loader: shows on a cold entry, lifts within 0.9 s, skipped on internal navigation and back/forward
{
  const page = await newPage();
  const log = watch(page);
  await page.goto(server.url, { waitUntil: 'domcontentloaded' });
  const early = await page.evaluate(() => ({
    on: document.documentElement.classList.contains('loader-on'),
    disp: getComputedStyle(document.querySelector('[data-loader]')).display,
  }));
  check('loader: visible on a cold home entry', early.on && early.disp !== 'none');
  const t0 = Date.now();
  await page.waitForFunction(() => !document.querySelector('[data-loader]'), { timeout: 3000 });
  const took = Date.now() - t0;
  check('loader: gone about 0.9 s after boot', took < 1100, `${took} ms after DOMContentLoaded`);
  await sleep(200);
  await realClick(page, 'a.hdr__link[href$="/cv/"]');
  await page.waitForFunction(() => document.documentElement.dataset.page === 'cv');
  await realClick(page, 'a.hdr__brand');
  await page.waitForFunction(() => document.documentElement.dataset.page === 'home');
  const internal = await page.evaluate(() => ({
    on: document.documentElement.classList.contains('loader-on'),
    nav: document.documentElement.dataset.nav,
  }));
  check('loader: skipped on internal navigation (same-origin referrer)', !internal.on && internal.nav === 'internal');
  await page.goBack();
  await page.goForward();
  await page.waitForFunction(() => document.documentElement.dataset.page === 'home');
  const bf = await page.evaluate(() => document.documentElement.classList.contains('loader-on'));
  check('loader: skipped on back/forward', !bf);
  check('console clean through navigation', !log.errors.length, log.errors.join(' | '));
  await page.close();
}

// ---- header tone + Lenis + cursor on desktop
{
  const page = await newPage();
  const log = watch(page);
  await page.goto(server.url, { waitUntil: 'networkidle0' });
  await sleep(1300);
  check('lenis: window.__lenis exists on a fine pointer', await page.evaluate(() => !!window.__lenis));
  check('header tone: noir on the hero', (await tone(page)) === 'noir');
  await parkLenis(page, (await topOf(page, '#work')) + 60);
  await sleep(500);
  check('header tone: cotton over the works sheet', (await tone(page)) === 'cotton');
  if (shots) await shot(page, path.join(siteRoot, shots, `${prefix}chrome-header-cotton-1440.png`));
  await parkLenis(page, (await topOf(page, '#contact')) - 20);
  await sleep(500);
  check('header tone: noir again on the contact close', (await tone(page)) === 'noir');
  await parkLenis(page, 0);
  await sleep(500);
  check('header tone: noir back at the top', (await tone(page)) === 'noir');

  await page.mouse.move(700, 300);
  await sleep(450);
  const dot = await page.evaluate(() => {
    const r = document.querySelector('.cursor__disc').getBoundingClientRect();
    const root = document.querySelector('[data-cursor-root]');
    return {
      w: Math.round(r.width),
      cx: Math.round(r.left + r.width / 2),
      cy: Math.round(r.top + r.height / 2),
      on: root.classList.contains('is-on'),
      blend: getComputedStyle(root).mixBlendMode,
    };
  });
  check('cursor: 10px difference disc, centred on the pointer', dot.w === 10 && Math.abs(dot.cx - 700) <= 1 && Math.abs(dot.cy - 300) <= 1 && dot.on && dot.blend === 'difference', JSON.stringify(dot));
  const link = await page.$('a.hdr__link');
  const lb = await link.boundingBox();
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await sleep(450);
  check('cursor: 28px over a link', (await discW(page)) === 28);

  await parkLenis(page, (await topOf(page, '#work a[data-cursor="view"]')) - 300);
  await sleep(400);
  const row = await page.$('#work a[data-cursor="view"]');
  const rb = await row.boundingBox();
  await page.mouse.move(rb.x + 40, rb.y + rb.height / 2);
  await sleep(450);
  check('cursor: 72px "view" over a work row', (await discW(page)) === 72);

  await parkLenis(page, 1e6);
  await sleep(400);
  const fw = await page.evaluate(() => {
    const r = document.querySelector('.foot__word svg').getBoundingClientRect();
    return { l: Math.round(r.left), w: Math.round(r.width), vw: innerWidth };
  });
  check('footer: GURBANOV. wordmark spans the viewport edge to edge', fw.l === 0 && fw.w === fw.vw, JSON.stringify(fw));
  if (shots) await shot(page, path.join(siteRoot, shots, `${prefix}chrome-footer-1440.png`));
  check('console clean on desktop', !log.errors.length, log.errors.join(' | '));
  await page.close();
}

// ---- language toggle with real clicks, hash and route preserved
{
  const page = await newPage();
  await page.goto(server.url + 'cv/#vault', { waitUntil: 'networkidle0' });
  await sleep(500);
  await realClick(page, 'a.lang__seg[hreflang="de"]');
  await page.waitForFunction(() => document.documentElement.dataset.lang === 'de');
  const u = page.url();
  check('toggle: /cv/#vault -> /de/cv/#vault (route and hash kept)', u.endsWith('/rustam-portfolio/de/cv/#vault'), u);
  const state = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    cur: document.querySelector('a.lang__seg[aria-current="true"]').hreflang,
    ls: localStorage.length,
    ss: sessionStorage.length,
    cookie: document.cookie,
  }));
  check('toggle: html lang de-AT, current segment DE, nothing stored', state.lang === 'de-AT' && state.cur === 'de' && state.ls === 0 && state.ss === 0 && state.cookie === '', JSON.stringify(state));
  await page.close();
}

// ---- touch phone
{
  const page = await newPage({ w: 390, h: 844 });
  await page.goto(server.url, { waitUntil: 'networkidle0' });
  await sleep(1300);
  const s = await page.evaluate(() => ({
    cursor: !!document.querySelector('[data-cursor-root]'),
    has: document.documentElement.classList.contains('has-cursor'),
    lenis: !!window.__lenis,
    tab: !!document.querySelector('nav[data-tabbar][hidden]'),
    h: Math.round(document.querySelector('[data-header]').getBoundingClientRect().height),
    navShown: getComputedStyle(document.querySelector('.hdr__nav')).display !== 'none',
  }));
  check('phone: cursor unmounted, Lenis off, tab-bar slot reserved, header 56px, nav hidden', !s.cursor && !s.has && !s.lenis && s.tab && s.h === 56 && !s.navShown, JSON.stringify(s));
  await page.close();
}

// ---- reduced motion
{
  const page = await newPage({ w: 1440, h: 900 }, (p) => p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]));
  await page.goto(server.url, { waitUntil: 'networkidle0' });
  await sleep(300);
  const s = await page.evaluate(() => ({
    reduced: document.documentElement.classList.contains('reduced'),
    loader: document.documentElement.classList.contains('loader-on') || !!document.querySelector('[data-loader]'),
    lenis: !!window.__lenis,
    cursor: document.documentElement.classList.contains('has-cursor'),
  }));
  check('reduced motion: no loader, no Lenis, cursor hidden', s.reduced && !s.loader && !s.lenis && !s.cursor, JSON.stringify(s));
  await page.close();
}

await browser.close();
await server.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
