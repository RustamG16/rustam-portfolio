/* =====================================================================
   THE RETICLE — shared pointer for index.html and cv.html
   ---------------------------------------------------------------------
   The old acid dot was retired because it used mix-blend-mode:screen,
   which renders to nothing over the cream paper sheets. This one carries
   no blend mode at all: it reads which theme it is standing on and swaps
   its own ink, so it is legible on both halves of the document.

   Form follows the rest of the file: a square hairline reticle (the same
   registration language as .hero__mark and .plate__corner) that swells
   over links and, over a work row, becomes a round stamp reading VIEW.
   The square-to-circle morph is the whole gag — a reticle inspecting the
   page turns into a stamp approving it.

   Never mounts on coarse pointers or under prefers-reduced-motion, and
   only IT sets `cursor:none` (via html.has-cursor), so every path that
   does not run this file keeps the native arrow.
   ===================================================================== */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || calm.matches) return;
  if (typeof gsap === 'undefined') return; /* no GSAP, no reticle — native arrow stays */

  const root = document.createElement('div');
  root.className = 'cursor';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<span class="cursor__ring"><span class="cursor__label"></span></span>' +
    '<span class="cursor__dot"></span>';
  document.body.appendChild(root);
  document.documentElement.classList.add('has-cursor');

  const ring = root.querySelector('.cursor__ring');
  const dot = root.querySelector('.cursor__dot');
  const label = root.querySelector('.cursor__label');

  /* centring lives in GSAP, not CSS: a CSS `transform: translate(-50%,-50%)`
     would be overwritten the moment quickTo writes x/y. xPercent/yPercent
     compose with x/y inside GSAP's own transform, so both survive. */
  gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });

  /* quickTo reuses one tween per property instead of spawning a new tween on
     every pointermove. The ring lags the dot — that gap is what makes the
     thing feel weighted rather than glued to the mouse. */
  const dotX = gsap.quickTo(dot, 'x', { duration: 0.09, ease: 'power2.out' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.09, ease: 'power2.out' });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.42, ease: 'power3.out' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.42, ease: 'power3.out' });

  let px = innerWidth / 2;
  let py = innerHeight / 2;
  let seen = false;

  /* ---------- which half of the document are we standing on? ----------
     Sampled on a timer rather than per-move: one elementFromPoint hit test
     every ~120ms is invisible next to a 60Hz move stream, and the answer
     only changes when you cross a section edge. The reticle is
     pointer-events:none, so it can never hit-test itself. */
  let themeTimer = 0;
  const THEME_SEL = '.theme-dark,.theme-paper,.cv-sec--dark,.cv-sec--paper';
  const sampleTheme = () => {
    const el = document.elementFromPoint(px, py);
    const sec = el && el.closest ? el.closest(THEME_SEL) : null;
    /* default to dark: the page background outside any section is --bg */
    const onPaper = !!sec &&
      (sec.classList.contains('theme-paper') || sec.classList.contains('cv-sec--paper'));
    root.classList.toggle('cursor--on-paper', onPaper);
  };

  const onMove = (e) => {
    px = e.clientX;
    py = e.clientY;
    if (!seen) {
      seen = true;
      /* jump to the pointer on the first move instead of flying in from the
         middle of the screen */
      gsap.set([dot, ring], { x: px, y: py });
      root.classList.add('is-awake');
      sampleTheme();
    }
    dotX(px); dotY(py);
    ringX(px); ringY(py);
    if (!themeTimer) {
      themeTimer = setTimeout(() => { themeTimer = 0; sampleTheme(); }, 120);
    }
  };

  addEventListener('pointermove', onMove, { passive: true });

  /* ---------- states ----------
     Tracking is transform-only (the hot path). Size and shape are tweened
     only on these discrete enter/leave events, so the layout work happens a
     few times a minute, not sixty times a second. */
  const STATES = {
    base: { size: 26, radius: 0, ink: 0, ring: 1 },
    link: { size: 46, radius: 0, ink: 0, ring: 1 },
    view: { size: 92, radius: 46, ink: 1, ring: 1 }
  };

  let state = 'base';
  const setState = (next, text) => {
    if (next === state && !text) return;
    state = next;
    const s = STATES[next] || STATES.base;
    root.classList.toggle('cursor--filled', s.ink === 1);
    gsap.to(ring, {
      width: s.size,
      height: s.size,
      borderRadius: s.radius,
      duration: 0.42,
      ease: 'power3.out',
      overwrite: 'auto'
    });
    gsap.to(dot, {
      opacity: next === 'base' ? 1 : 0,
      scale: next === 'base' ? 1 : 0.4,
      duration: 0.3,
      ease: 'power3.out',
      overwrite: 'auto'
    });
    /* the legend has to outlive its own fade — clearing the text up front
       meant the word vanished instantly and only an empty box faded */
    if (s.ink) {
      label.textContent = text || '';
      gsap.to(label, { opacity: 1, duration: 0.34, delay: 0.08, ease: 'power2.out', overwrite: 'auto' });
    } else {
      /* out fast — the ring is already collapsing underneath it */
      gsap.to(label, {
        opacity: 0, duration: 0.1, ease: 'power2.out', overwrite: 'auto',
        onComplete: () => { if (!STATES[state].ink) label.textContent = ''; }
      });
    }
  };

  /* One delegated listener rather than one per element, so rows and links
     added later (or swapped by a language toggle) need no re-binding. */
  const TARGET_SEL = '[data-cursor],a,button,summary,.btn,label[for]';
  addEventListener('pointerover', (e) => {
    const t = e.target.closest ? e.target.closest(TARGET_SEL) : null;
    if (!t) { setState('base'); return; }
    const kind = t.dataset.cursor || 'link';
    setState(kind === 'view' ? 'view' : 'link', t.dataset.cursorLabel || '');
  }, { passive: true });

  addEventListener('pointerout', (e) => {
    if (!e.relatedTarget) setState('base');
  }, { passive: true });

  /* leaving the window / tabbing away: hide rather than freeze a stale dot */
  const hide = () => root.classList.remove('is-awake');
  const show = () => { if (seen) root.classList.add('is-awake'); };
  document.addEventListener('mouseleave', hide);
  document.addEventListener('mouseenter', show);
  addEventListener('blur', hide);
  addEventListener('focus', show);

  /* pressed state — a small acknowledgement, nothing more */
  addEventListener('pointerdown', () => root.classList.add('is-down'), { passive: true });
  addEventListener('pointerup', () => root.classList.remove('is-down'), { passive: true });

  /* if the pointer turns coarse mid-session (tablet keyboard undocked, or a
     devtools device emulation flip), stand down completely */
  const standDown = () => {
    if (fine.matches && !calm.matches) return;
    removeEventListener('pointermove', onMove);
    root.remove();
    document.documentElement.classList.remove('has-cursor');
  };
  if (fine.addEventListener) fine.addEventListener('change', standDown);
  if (calm.addEventListener) calm.addEventListener('change', standDown);
})();
