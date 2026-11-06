// Reduced-motion render (prefers-reduced-motion: reduce). Asserts the static end state of DESIGN.md Motion:
// no loader, no Lenis, no reveal hides anything (every [data-reveal] subject is visible with no transform, no line
// masks were built), no video plays or even loads, the cursor is not mounted, the works float preview shows a poster
// only on hover and focus, and nothing is written to storage. Home and CV, EN and DE, at 1440 and 390.
//   node qa/reduced.mjs [--dist dist]
import path from 'node:path';
import { serve, launch, watch, sleep, siteRoot } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };
const dist = path.resolve(siteRoot, arg('dist', 'dist'));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`);
};

const server = await serve(dist);
const browser = await launch();
const routes = [['home-en', ''], ['home-de', 'de/'], ['cv-en', 'cv/'], ['cv-de', 'de/cv/']];

for (const [id, p] of routes) {
  for (const vp of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp[0], height: vp[1], isMobile: vp[0] < 640, hasTouch: vp[0] < 640 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const log = watch(page);
    await page.goto(server.url + p, { waitUntil: 'networkidle0' });
    await sleep(700);
    const tag = `${id} ${vp[0]}`;
    const s = await page.evaluate(() => {
      const h = document.documentElement;
      const reveal = [...document.querySelectorAll('[data-reveal]')];
      const hidden = reveal.filter((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return Number(cs.opacity) < 1 || (cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)') || cs.visibility === 'hidden' || cs.display === 'none' || r.width === 0;
      }).length;
      const vids = [...document.querySelectorAll('video')];
      return {
        reduced: h.classList.contains('reduced'),
        loader: h.classList.contains('loader-on'),
        lenis: !!window.__lenis,
        reveals: reveal.length,
        hidden,
        masks: document.querySelectorAll('.rv-line-mask').length,
        splitAria: document.querySelectorAll('[data-reveal="lines"][aria-label]').length,
        videos: vids.length,
        videoPlaying: vids.filter((v) => !v.paused).length,
        videoSrc: vids.filter((v) => v.getAttribute('src')).length,
        cursor: !!document.querySelector('[data-cursor-root]'),
        float: !!document.querySelector('.wfloat'),
        storage: localStorage.length + sessionStorage.length + document.cookie.length,
        overflow: h.scrollWidth - h.clientWidth,
      };
    });
    check(`${tag}: reduced class set, no loader, no Lenis`, s.reduced && !s.loader && !s.lenis, JSON.stringify({ r: s.reduced, l: s.loader, len: s.lenis }));
    check(`${tag}: all ${s.reveals} [data-reveal] subjects visible, no line masks built`, s.hidden === 0 && s.masks === 0 && s.splitAria === 0, JSON.stringify({ hidden: s.hidden, masks: s.masks }));
    check(`${tag}: no video playing, none even has a source`, s.videoPlaying === 0 && s.videoSrc === 0, `videos=${s.videos}`);
    check(`${tag}: cursor not mounted, nothing stored, no overflow`, !s.cursor && s.storage === 0 && s.overflow <= 0);

    if (id === 'home-en' && vp[0] === 1440) {
      // works under reduced motion: hover and focus show a poster, never a film
      const row = await page.$('a[data-work="savra"]');
      await page.evaluate(() => window.scrollTo({ top: document.querySelector('[data-works-list]').getBoundingClientRect().top + scrollY - 140, behavior: 'instant' }));
      await sleep(300);
      const b = await row.boundingBox();
      await page.mouse.move(b.x + b.width * 0.35, b.y + b.height / 2, { steps: 4 });
      await sleep(1500);
      const f = await page.evaluate(() => {
        const fl = document.querySelector('.wfloat');
        if (!fl) return null;
        const v = fl.querySelector('video');
        return { poster: fl.querySelector('img').dataset.id, clip: getComputedStyle(fl).clipPath, playing: !v.paused, src: v.getAttribute('src'), film: fl.dataset.film };
      });
      check('home-en 1440: hover shows the poster only (no film, no source, no play)', !!f && f.poster === 'savra' && /inset\(0/.test(f.clip) && !f.playing && !f.src && f.film === 'off', JSON.stringify(f));
    }
    check(`${tag}: 0 console errors`, log.errors.length === 0, log.errors.join(' | '));
    await page.close();
  }
}
await browser.close();
await server.close();
const bad = results.filter((r) => !r.ok);
console.log(`\nreduced: ${results.length - bad.length}/${results.length} ok`);
process.exit(bad.length ? 1 : 0);
