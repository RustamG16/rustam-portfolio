// Real dispatched clicks (page.mouse), never el.click(). Lenis is parked first, then the real click is kept
// (memories feedback-verify-real-clicks-not-synthetic, lenis-breaks-playwright-stability). Puppeteer hover needs the
// element scrolled into view first (realClick/hoverRow do that).
//
// Checks: every works row opens the right URL in a NEW tab; the float preview (armed, follows the row, plays the
// film, a rapid sweep never leaves a stale film, closes and pauses on leave); the phone carousel (no float);
// the language toggle keeps the hash; the CV spine links jump; the documents lightbox opens, traps focus, closes on
// Escape / close button / backdrop and returns focus. Screenshots: qa/shots/08-float-hover-1440.png,
// 08-lightbox-{1440,390}.png.
//   node qa/real-clicks.mjs [--dist dist] [--shots]   (--shots also writes qa/shots/08-{home,cv}-{en,de}-{1440,1024,390}.png:
//   full page, taken after one slow pass down the page so every reveal has played)
import path from 'node:path';
import { serve, launch, watch, shot, sleep, parkLenis, siteRoot } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const dist = path.resolve(siteRoot, arg('dist', 'dist'));
const shots = path.join(siteRoot, 'qa/shots');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`);
};

const server = await serve(dist);
const browser = await launch();

const worksUrls = {
  convenium: 'https://convenium.at',
  meridian: 'https://rustamg16.github.io/003-meridian-mvp/',
  sonnwerk: 'https://rustamg16.github.io/002-sonnwerk/',
  'wild-gruppe': 'https://rustamg16.github.io/wild-gruppe/',
  savra: 'https://rustamg16.github.io/Savra_v2/',
  doko: 'https://rustamg16.github.io/doko-barbershop-proposal/',
};
const ids = Object.keys(worksUrls);

async function open(path_, vp, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp[0], height: vp[1], isMobile: !!opts.touch, hasTouch: !!opts.touch, deviceScaleFactor: 1 });
  const log = watch(page);
  await page.goto(server.url + path_, { waitUntil: 'networkidle0' });
  await sleep(1300); // loader curtain + fonts
  return { page, log };
}

/** Instant jump (never the CSS smooth scroll, which leaves stale boxes): Lenis parked, else a plain instant scroll. */
async function jump(page, y) {
  await page.evaluate((yy) => {
    if (window.__lenis) window.__lenis.scrollTo(yy, { immediate: true });
    else window.scrollTo({ top: yy, behavior: 'instant' });
  }, y);
  await sleep(260);
}
/** bring an element to the middle of the viewport (instant), return its box */
async function bring(page, sel, frac = 0.5) {
  const y = await page.evaluate((q, f) => {
    const r = document.querySelector(q).getBoundingClientRect();
    return Math.max(0, r.top + scrollY + r.height / 2 - innerHeight * f);
  }, sel, frac);
  await jump(page, y);
  return (await page.$(sel)).boundingBox();
}
/** park so the whole works list is on screen, then move the real mouse onto a row */
async function hoverRow(page, id) {
  const el = await page.$(`a[data-work="${id}"]`);
  let b = await el.boundingBox();
  const vh = page.viewport().height;
  if (b.y < 90 || b.y + b.height > vh - 10) {
    await bring(page, '[data-works-list]', 0.52);
    b = await el.boundingBox();
  }
  const x = b.x + b.width * 0.35;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y, { steps: 4 });
  return { x, y };
}

const floatState = (page) =>
  page.evaluate(() => {
    const f = document.querySelector('.wfloat');
    if (!f) return null;
    const v = f.querySelector('video');
    const p = f.querySelector('img');
    return {
      clip: getComputedStyle(f).clipPath,
      film: f.dataset.film,
      posterId: p.dataset.id || null,
      filmId: v.dataset.id || null,
      playing: !v.paused && !v.ended,
      time: v.currentTime,
      src: v.getAttribute('src'),
      w: f.getBoundingClientRect().width,
      h: f.getBoundingClientRect().height,
      top: f.getBoundingClientRect().top,
    };
  });

// ===================== desktop home =====================
{
  const { page, log } = await open('', [1440, 900]);
  await parkLenis(page, 0);

  check('works: data-float armed on fine pointer >= 960', (await page.$eval('[data-works]', (e) => e.dataset.float)) === 'armed');

  // 1. every row: a REAL click opens the right URL in a new tab
  for (const id of ids) {
    const b = await bring(page, `a[data-work="${id}"]`);
    const created = new Promise((res) => browser.once('targetcreated', res));
    await page.mouse.click(b.x + b.width * 0.4, b.y + b.height / 2);
    const target = await Promise.race([created, sleep(4000).then(() => null)]);
    let url = '';
    if (target) {
      for (let i = 0; i < 40 && (!url || url === 'about:blank'); i++) { await sleep(100); url = target.url(); }
      const p = await target.page().catch(() => null);
      if (p) await p.close().catch(() => {});
    }
    check(`row ${id}: click opens a new tab at the live URL`, !!target && url.startsWith(worksUrls[id].replace(/\/$/, '')), url || 'no tab');
    await page.bringToFront();
    await page.mouse.move(5, 5);
    await sleep(120);
  }

  // 2. float preview: mid-hover state, film plays, follows Y
  await hoverRow(page, 'meridian');
  await sleep(2200);
  let s = await floatState(page);
  check('float: 320x400 frame exists, open, poster id = meridian', !!s && Math.round(s.w) === 320 && Math.round(s.h) === 400 && s.posterId === 'meridian' && /inset\(0(px|%)?( 0(px|%)?){0,3}\)/.test(s.clip), JSON.stringify(s));
  check('float: film attached on first hover only, lit by its own generation, playing', !!s && s.filmId === 'meridian' && s.film === 'on' && s.playing && /meridian\/film\.mp4/.test(s.src || ''), s ? `film=${s.film} playing=${s.playing}` : '');
  const y1 = s.top;
  await shot(page, path.join(shots, '08-float-hover-1440.png'));
  await bring(page, '[data-works-list]', 0.52);
  const bb = await (await page.$('a[data-work="doko"]')).boundingBox();
  await page.mouse.move(bb.x + bb.width * 0.35, bb.y + bb.height / 2, { steps: 6 });
  await sleep(1800);
  s = await floatState(page);
  check('float: follows the pointer down to DOKO (Y moved, poster + film swapped)', s.top > y1 + 100 && s.posterId === 'doko' && s.filmId === 'doko' && s.film === 'on', `top ${Math.round(y1)} -> ${Math.round(s.top)}`);

  // 3. rapid sweep over all rows: no stale film may stay lit
  await bring(page, '[data-works-list]', 0.52);
  for (const id of ids) {
    const r = await page.$(`a[data-work="${id}"]`);
    const rb = await r.boundingBox();
    await page.mouse.move(rb.x + rb.width * 0.35, rb.y + rb.height / 2, { steps: 2 });
    await sleep(45);
  }
  await sleep(1800);
  s = await floatState(page);
  check('float: rapid sweep ends on the last row only (token holds, no stale film)', s.posterId === 'doko' && s.filmId === 'doko' && s.film === 'on' && s.playing, JSON.stringify({ p: s.posterId, f: s.filmId, film: s.film }));

  // 4. leave: closes in 0.24 s, pauses
  await page.mouse.move(700, 8);
  await sleep(700);
  s = await floatState(page);
  check('float: leaving the list closes the frame and pauses the film', /inset\(100%/.test(s.clip) && !s.playing && s.film === 'off', JSON.stringify({ clip: s.clip, playing: s.playing, film: s.film }));

  // 5. keyboard focus: poster only, never a film
  await bring(page, '[data-works-list]', 0.52);
  await page.focus('a[data-work="convenium"]');
  await page.keyboard.press('Tab'); // real key press: focus-visible
  await sleep(1200);
  s = await floatState(page);
  check('float: keyboard focus shows the poster and never plays a film', s.posterId === 'meridian' && !s.playing && s.film === 'off' && /inset\(0/.test(s.clip), JSON.stringify({ p: s.posterId, playing: s.playing, film: s.film, clip: s.clip }));
  await page.mouse.move(5, 5);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());

  // 6. toggle keeps the hash (a real click)
  await jump(page, 0);
  await page.evaluate(() => { history.replaceState(null, '', '#work'); });
  await sleep(300);
  const tg = await page.$('a[hreflang="de"]');
  const tb = await tg.boundingBox();
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2)]);
  check('toggle: a real click on DE lands on /de/#work', /\/de\/#work$/.test(page.url()), page.url());

  check('home: 0 console errors', log.errors.length === 0, log.errors.join(' | '));
  await page.close();
}

// ===================== phone home: carousel, no float =====================
{
  const { page, log } = await open('', [390, 844], { touch: true });
  const info = await page.evaluate(() => {
    const l = document.querySelector('[data-works-list]');
    return { preview: document.querySelector('[data-works]').dataset.float, float: !!document.querySelector('.wfloat'), scrolls: l.scrollWidth > l.clientWidth + 20, snap: getComputedStyle(l).scrollSnapType, flex: getComputedStyle(l).display };
  });
  check('phone: works are a snap carousel, float preview disarmed and absent', info.preview === 'off' && !info.float && info.scrolls && /x/.test(info.snap) && info.flex === 'flex', JSON.stringify(info));
  const labels = await page.$$eval('a[data-work]', (as) => as.map((a) => {
    const st = a.querySelector('.row__state');
    const r = st.getBoundingClientRect();
    return { txt: st.textContent.trim(), shown: getComputedStyle(st).display !== 'none' && r.width > 0 };
  }));
  check('phone: all six state labels are in the DOM and rendered', labels.length === 6 && labels.every((l) => l.shown && l.txt), labels.map((l) => l.txt).join(' / '));
  check('phone: 0 console errors', log.errors.length === 0, log.errors.join(' | '));
  await page.close();
}

// ===================== CV: spine, lightbox =====================
for (const [vp, label, touch] of [[[1440, 900], '1440', false], [[390, 844], '390', true]]) {
  const { page, log } = await open('cv/', vp, { touch });
  await jump(page, 0);

  // spine links jump (real click), the active state follows
  const target = 'languages';
  await jump(page, vp[0] >= 960 ? 2000 : 1500); // the rail is sticky: on screen from here on
  const link = await page.$(`[data-cv-spine] a[href="#${target}"]`);
  await link.evaluate((n) => n.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' })); // the phone strip scrolls sideways
  await sleep(200);
  const lb = await link.boundingBox();
  await page.mouse.click(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await sleep(1600);
  const landedAt = await page.evaluate((id) => {
    const r = document.getElementById(id).getBoundingClientRect();
    const cur = document.querySelector('[data-cv-spine] [aria-current="location"]');
    return { top: Math.round(r.top), cur: cur && cur.getAttribute('href') };
  }, target);
  check(`cv ${label}: spine link jumps to #${target} and becomes current`, landedAt.top > 40 && landedAt.top < 200 && landedAt.cur === `#${target}`, JSON.stringify(landedAt));

  // lightbox: open with a real click on a card
  await jump(page, await page.evaluate(() => document.getElementById('vault').getBoundingClientRect().top + scrollY - 80));
  const opener = await page.$('#doc-knime a[data-doc-open].doc__btn');
  await opener.evaluate((n) => n.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' }));
  await sleep(300);
  const ob = await opener.boundingBox();
  await page.mouse.click(ob.x + ob.width / 2, ob.y + ob.height / 2);
  await sleep(500);
  let lbs = await page.evaluate(() => {
    const d = document.querySelector('dialog[data-lightbox]');
    return { open: d.open, src: d.querySelector('[data-lb-img]').getAttribute('src'), title: d.querySelector('[data-lb-title]').textContent, focusInside: d.contains(document.activeElement), lenisPrevent: d.hasAttribute('data-lenis-prevent') && d.querySelector('[data-lb-stage]').hasAttribute('data-lenis-prevent'), pdf: d.querySelector('[data-lb-pdf]').getAttribute('href') };
  });
  check(`cv ${label}: lightbox opens with the full scan, title, PDF link, focus inside`, lbs.open && /full\/ifx-knime-award\.webp$/.test(lbs.src) && lbs.title.includes('KNIME') && /ifx-knime-pioneer-award\.pdf$/.test(lbs.pdf) && lbs.focusInside && lbs.lenisPrevent, JSON.stringify(lbs));
  await sleep(700);
  await shot(page, path.join(shots, `08-lightbox-${label}.png`));

  // focus trap: Tab 8 times, focus never leaves the dialog
  let leaked = false;
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    if (!(await page.evaluate(() => document.querySelector('dialog[data-lightbox]').contains(document.activeElement)))) leaked = true;
  }
  for (let i = 0; i < 4; i++) {
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
    if (!(await page.evaluate(() => document.querySelector('dialog[data-lightbox]').contains(document.activeElement)))) leaked = true;
  }
  check(`cv ${label}: Tab and Shift+Tab never leave the lightbox`, !leaked);

  // Escape closes, focus returns to the opener
  await page.keyboard.press('Escape');
  await sleep(300);
  let after = await page.evaluate(() => ({ open: document.querySelector('dialog[data-lightbox]').open, back: document.activeElement && document.activeElement.closest('#doc-knime') !== null && document.activeElement.hasAttribute('data-doc-open') }));
  check(`cv ${label}: Escape closes it and focus returns to the opener`, !after.open && after.back, JSON.stringify(after));

  // close button (real click) and backdrop click (desktop: outside the plate)
  await page.mouse.click(ob.x + ob.width / 2, ob.y + ob.height / 2);
  await sleep(400);
  const cb = await (await page.$('[data-lightbox-close]')).boundingBox();
  await page.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await sleep(300);
  check(`cv ${label}: the close button closes it`, !(await page.$eval('dialog[data-lightbox]', (d) => d.open)));
  if (!touch) {
    await page.mouse.click(ob.x + ob.width / 2, ob.y + ob.height / 2);
    await sleep(400);
    await page.mouse.click(8, 450); // on the backdrop, outside the 1100 px plate
    await sleep(300);
    check('cv 1440: a click on the backdrop closes it', !(await page.$eval('dialog[data-lightbox]', (d) => d.open)));
  }

  // old links land on the card
  await page.goto(server.url + 'cv/#doc-ref2', { waitUntil: 'networkidle0' });
  await sleep(900);
  const landed = await page.evaluate(() => { const r = document.getElementById('doc-ref2').getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight && r.left < innerWidth && r.right > 0; });
  check(`cv ${label}: /cv/#doc-ref2 lands with the card in view`, landed);
  check(`cv ${label}: 0 console errors`, log.errors.length === 0, log.errors.join(' | '));
  await page.close();
}

if (process.argv.includes('--shots')) {
  for (const [id, p] of [['home-en', ''], ['home-de', 'de/'], ['cv-en', 'cv/'], ['cv-de', 'de/cv/']]) {
    for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
      const { page } = await open(p, [w, h], { touch: w < 640 });
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(h * 0.6)) await jump(page, y);
      await sleep(900);
      await jump(page, 0);
      await shot(page, path.join(shots, `08-${id}-${w}.png`), { fullPage: true });
      await page.close();
    }
  }
  console.log('shots: qa/shots/08-*.png written');
}

await browser.close();
await server.close();
const bad = results.filter((r) => !r.ok);
console.log(`\nreal-clicks: ${results.length - bad.length}/${results.length} ok`);
process.exit(bad.length ? 1 : 0);
