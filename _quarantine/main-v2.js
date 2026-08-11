/* =====================================================================
   SITE-ENGINE v0.2 — ORBIT SPINE + PERSONA scaffold (Brief RG-2026 v2)

   v1 (main.js) drove the 360-frame flipbook from ONE hero-scoped
   ScrollTrigger and killed the canvas at the bottom of the hero. v2's
   concept (PROMPT-redesign-v2.md, "The orbit becomes the document's
   spine, not the hero's trick") drives it from TOTAL PAGE progress
   instead — 00 Cover's top to 04 Close's bottom — so scrolling the whole
   document walks one complete rotation, and because orbit-b was
   generated to end on orbit-a's first frame, the document closes on the
   same face it opened on.

   PHASE 1 built the page-scoped orbit driver (#orbit-spine, .has-orbit-spine,
   the orbitClock/orbitTl ScrollTrigger, seamProgress). PHASE 2 (this pass)
   built the choreography over the top of it against zeus's REAL markup —
   sheet-entry motion, the capability entry (unpinned — see that IIFE),
   the #worx-preview crossfade, and the 1px seam misregistration beat. The
   frame counter is #gauge-cur/#gauge-total inside #proofbar-frame; there
   never was a separate #hero-gauge or .hero__mark corners in the shipped
   markup — that was Phase 1's placeholder guess, superseded once zeus's
   actual build landed. The one placeholder that WAS live and has now been
   deleted as dead code: #gauge-fill (a vertical HUD track with no v2
   counterpart — the horizontal .proofbar__swatch replaces it and was
   already wired correctly elsewhere in this file).

     NEW  #orbit-spine        position:fixed, full-viewport, a SIBLING of
                               <main> — not a hero child. Painted behind
                               every sheet. Houses #orbit-canvas (same
                               element as v1).
     NEW  <html>.has-orbit-spine   toggled by this file exactly like v1's
                               hero.dataset.cover — true only on the
                               desktop/scrub path. CSS hides #orbit-spine
                               without it, mirroring the existing SCRUB_MQ
                               + .brief-root:not(.js) pattern that already
                               hides #orbit-canvas.
     UNCHANGED  #orbit-canvas, #gauge-cur/#gauge-total,
                               .hero__sticky (now text-only — see the
                               hero-entrance section below), .hero__id
                               still cover, SCRUB_MQ gate.

   ---------- the cover exists in two forms (unchanged from v1) ----------
   Wide LANDSCAPE viewports get the scrubbed flipbook, now spanning the
   whole document. Everything narrower — phones, portrait tablets — gets
   the still cover (.hero__id portrait) and downloads not one frame; that
   branch is untouched in this phase.

   SCRUB_MQ must stay in sync with the preload <link media> attributes in
   index-v2.html and with the still-cover media query in style-v2.css. */
const SCRUB_MQ = '(min-width: 901px) and (min-aspect-ratio: 13/20)';
const scrubMQ = matchMedia(SCRUB_MQ);

/* One directory, two encodings. AVIF is primary; WebP is the fallback,
   picked up automatically if frame 0 fails to decode. */
const FRAME_SETS = {
  desktop:     { path: 'frames/hero/frame_', ext: '.avif', count: 360, pad: 4, poster: 'media/poster.webp' },
  desktopWebp: { path: 'frames/hero/frame_', ext: '.webp', count: 360, pad: 4, poster: 'media/poster.webp' }
};

/* CONFIG.heroScrub still governs ONLY the hero's own text entrance (cold
   open — kicker, per-character name, metadata rows), which stays scoped
   to hero progress exactly as in v1. The flipbook itself no longer reads
   any of these fractions — see "the orbit spine" section below. */
const CONFIG = {
  frames: FRAME_SETS.desktop,
  heroScrub: {
    kickerRevealAt: 0.012,
    nameRevealEnd: 0.16,
    subRevealAt: 0.11,
    metaStart: 0.13, metaEnd: 0.30,   /* rows stagger by SCROLL, not by time */
    actionsRevealAt: 0.30,
    hintFadeAt: 0.05
  },
  pillarsSteps: 3,
  stripRevealAt: 0.2
};

/* frame-count-based timings below are authored for the 360-frame set */
const FRAME_SCALE = CONFIG.frames.count / 360;
const scaleFrames = (n) => Math.max(2, Math.round(n * FRAME_SCALE));

/* ---------- smooth scroll (Lenis, desktop wheel only) + GSAP ticker ---------- */
let lenis = null;
const isTouchDevice = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const gsapReady = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
if (gsapReady) {
  gsap.registerPlugin(ScrollTrigger);
  if (typeof ScrollToPlugin !== 'undefined') gsap.registerPlugin(ScrollToPlugin);
}
try {
  if (window.Lenis && !matchMedia('(prefers-reduced-motion: reduce)').matches && !isTouchDevice) {
    lenis = new Lenis({ lerp: 0.09, smoothTouch: false });
    /* exposed the way cv.js already exposes it: a programmatic jump has to go
       through Lenis, or its virtual position and the real one desync and every
       scrubbed ScrollTrigger reads a stale scroll offset */
    window.__lenis = lenis;
    if (gsapReady) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
} catch (e) { /* native scroll fallback */ }

const SEAM_CONFIG = {
  seamFrame: Math.round(160 * FRAME_SCALE),
  buildFrames: scaleFrames(10),
  decayFrames: scaleFrames(18),
  peakOpacity: 0.3,
  color: 'rgba(80, 255, 190, 1)',
  gradeFrames: scaleFrames(24),
  gradePeak: 0.25,
  gradeColor: 'rgba(0, 20, 12, 1)',
  bloomCenterX: 0.7,
  bloomCenterY: 0.4,
  bloomEdgeAlpha: 0.15,
  glitch: {
    windowFrames: scaleFrames(8),
    maxChannelShift: 14,
    ghostAlpha: 0.5,
    maxSlices: 6,
    maxSliceHeight: 30,
    maxSliceOffset: 60,
    scanlineColor: 'rgba(80, 255, 190, 1)',
    scanlineAlpha: 0.35
  }
};

/* v2: seamFrame itself doesn't change — it is still the physical frame
   (per LOG.md, ~160/161) where orbit-a hands off to orbit-b, and every
   effect below (seamFlashAlpha/seamGradeAlpha/drawGlitch) compares the
   CURRENTLY DRAWN FRAME INDEX against it, which is correct regardless of
   what progress source produced that index. What changes in v2 is what
   fraction of the SCROLL DOCUMENT that frame now falls at: in v1 the 360
   frames were mapped across the hero's own pin range, so frame 160 landed
   at hero-progress ≈ 0.443; in v2 the same 360 frames are mapped across
   TOTAL page progress (00 Cover → 04 Close), so frame 160 lands at PAGE
   progress ≈ 0.443 of a ~5-section-tall document instead — inside 01
   Summary's zone per the brief's table, not still inside the cover.
   seamProgress is exported here so Phase 2's sheet-entry choreography can
   read it directly instead of re-deriving it. */
SEAM_CONFIG.seamProgress = SEAM_CONFIG.seamFrame / (CONFIG.frames.count - 1);

const smoothstep = (t) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

function seamFlashAlpha(frame, seam) {
  const { buildFrames, decayFrames, peakOpacity } = SEAM_CONFIG;
  if (frame < seam) {
    const d = seam - frame;
    if (d >= buildFrames) return 0;
    return peakOpacity * smoothstep(1 - d / buildFrames);
  }
  if (frame > seam) {
    const d = frame - seam;
    if (d >= decayFrames) return 0;
    return peakOpacity * (1 - smoothstep(d / decayFrames));
  }
  return peakOpacity;
}

function seamGradeAlpha(frame, seam) {
  const { gradeFrames, gradePeak } = SEAM_CONFIG;
  const d = frame - seam;
  if (d < 0 || d >= gradeFrames) return 0;
  return gradePeak * (1 - smoothstep(d / gradeFrames));
}

const rgbaAlpha = (rgba, a) => {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a})` : rgba;
};

const mulberry32 = (seed) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

let _glitchStrip = null;
let _glitchStripCtx = null;

function drawGlitch(ctx, img, i, seam, cw, ch) {
  const d = Math.abs(i - seam);
  const g = SEAM_CONFIG.glitch;
  if (d >= g.windowFrames) return;

  const t = 1 - d / g.windowFrames;
  const rng = mulberry32(i * 7919);
  const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  const dx = (cw - w) / 2, dy = (ch - h) / 2;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = g.ghostAlpha * t;
  const shift = g.maxChannelShift * t;
  ctx.drawImage(img, dx - shift, dy, w, h);
  ctx.drawImage(img, dx + shift, dy, w, h);
  ctx.restore();

  const sliceCount = Math.floor(t * g.maxSlices);
  if (sliceCount > 0) {
    if (!_glitchStrip) {
      _glitchStrip = document.createElement('canvas');
      _glitchStripCtx = _glitchStrip.getContext('2d');
    }
    if (_glitchStrip.width !== cw || _glitchStrip.height !== g.maxSliceHeight) {
      _glitchStrip.width = cw;
      _glitchStrip.height = g.maxSliceHeight;
    }
    const src = ctx.canvas;
    for (let n = 0; n < sliceCount; n++) {
      const sh = 8 + Math.floor(rng() * (g.maxSliceHeight - 8 + 1));
      const maxY = ch - sh;
      const sy = maxY > 0 ? Math.floor(rng() * maxY) : 0;
      const offsetX = Math.floor((rng() * 2 - 1) * g.maxSliceOffset * t);
      _glitchStripCtx.clearRect(0, 0, cw, sh);
      _glitchStripCtx.drawImage(src, 0, sy, cw, sh, 0, 0, cw, sh);
      ctx.drawImage(_glitchStrip, 0, 0, cw, sh, offsetX, sy, cw, sh);
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (let k = 0; k < 2; k++) {
    const maxY = ch - 2;
    const sy = maxY > 0 ? Math.floor(rng() * maxY) : 0;
    const lh = 1 + Math.floor(rng() * 2);
    ctx.fillStyle = rgbaAlpha(g.scanlineColor, g.scanlineAlpha * t);
    ctx.fillRect(0, sy, cw, lh);
  }
  ctx.restore();
}

/* ---------- FlipbookScrubber ---------- */
class FlipbookScrubber {
  constructor(canvas, cfg, glitchEl = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.cfg = cfg;
    this.glitchEl = glitchEl;
    this.count = cfg.count;
    this.images = new Array(this.count).fill(null);
    this.loaded = new Set();
    this.targetIdx = 0;
    this.displayIdx = 0;
    this.lastStepIdx = -1;
    this.painted = -1;
    this.poster = null;
    /* filled in when frame 0 reports its natural size; resize() needs it to
       know how big a backing store the frames can actually fill */
    this.frameW = 0;
    this.frameH = 0;
    /* v2: which frame the visitor actually starts at — set via preload()'s
       argument, read by preload() itself. Defaults to 0 (top of document)
       until the caller knows better. See preload() below for why this
       exists: on the full-document scrub a visitor can land anywhere. */
    this._startHint = 0;
    /* v2 Phase 2: fires once per forward pass through SEAM_CONFIG.seamFrame —
       see the "1px misregistration beat" wiring below, which sets this. */
    this.onSeamCross = null;
    this._seamCrossed = false;
    this.resize();
    /* ResizeObserver rather than window.resize: it fires on the canvas's own
       box, so a viewport resize that does not change the canvas (and, on the
       still cover, a URL-bar resize) costs nothing. */
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this.redraw());
      this._ro.observe(canvas);
    } else {
      addEventListener('resize', () => this.redraw());
    }
    if (cfg.poster) {
      const poster = new Image();
      poster.decoding = 'async';
      poster.onload = () => {
        this.poster = poster;
        if (this.painted < 0) this.drawPoster();
      };
      poster.src = cfg.poster;
    }
    /* v2: NOT auto-called here anymore. The old constructor kicked off
       preload() blind to scroll position, which was safe when the flipbook
       only ever started at the top of the hero. On the full-document scrub
       the caller has to tell it where the page actually is (see the orbit
       spine section in this file) — call scrubber.preload(startFrameIndex)
       explicitly right after construction. */
  }
  src(i) {
    const n = String(i + 1).padStart(this.cfg.pad, '0');
    return `${this.cfg.path}${n}${this.cfg.ext}`;
  }
  load(i) {
    if (i < 0 || i >= this.count || this.images[i]) return Promise.resolve();
    const img = new Image();
    img.decoding = 'async';
    this.images[i] = img;
    const done = () => {
      this.loaded.add(i);
      /* the first frame to arrive tells resize() the source resolution, which
         is what lets it refuse to allocate a canvas bigger than the frames */
      if (!this.frameW && img.naturalWidth) {
        this.frameW = img.naturalWidth;
        this.frameH = img.naturalHeight;
        this.resize();
      }
      const active = Math.round(this.displayIdx);
      if (this.painted < 0 && i === 0) this.draw(0);
      else if (i >= active - 2 && i <= active + 2) this.draw(active);
    };
    return new Promise((resolve) => {
      img.onload = () => {
        const finish = () => { done(); resolve(); };
        if (img.decode) img.decode().then(finish).catch(finish);
        else finish();
      };
      img.onerror = () => {
        this.images[i] = null;
        if (i === 0 && this.cfg.ext === '.avif') {
          this.fallbackToWebp().then(resolve);
          return;
        }
        resolve();
      };
      img.src = this.src(i);
    });
  }
  fallbackToWebp() {
    if (this._fellBack) return Promise.resolve();
    this._fellBack = true;
    const fb = FRAME_SETS.desktopWebp;
    this.cfg = fb;
    this.count = fb.count;
    this.images = new Array(this.count).fill(null);
    this.loaded = new Set();
    this.painted = -1;
    /* re-preload at the SAME start hint the caller originally gave us —
       the fallback swap must not forget where the visitor actually is */
    return this.preload();
  }
  /* v2: redesigned for a scroll distance that spans the whole document
     instead of one section. v1 always assumed the visitor starts at
     frame 0 (safe when the flipbook only lived inside the hero — nobody
     scrolls INTO the hero from below it). On the full-document scrub the
     visitor can land anywhere: a #work/#contact deep link, a mid-scroll
     reload, or simply having scrolled before every frame finished
     loading. preload(startHint) burst-loads a window AROUND that frame
     first, then background-fills the rest by radiating outward from it —
     not by sweeping 0→359 — so a visitor who starts mid-document isn't
     waiting behind frames they'll only reach by scrolling all the way
     back up. */
  preload(startHint) {
    if (startHint != null) {
      this._startHint = Math.max(0, Math.min(this.count - 1, Math.round(startHint)));
    }
    const start = this._startHint || 0;
    const kick = async () => {
      await this.load(0);
      if (start !== 0) await this.load(start);
      const burst = Math.min(10, this.count - 1);
      for (let d = 1; d <= burst; d++) {
        await this.load(start + d);
        await this.load(start - d);
      }
      let lo = start - burst - 1;
      let hi = start + burst + 1;
      const fill = () => {
        let n = 0;
        while (n < 6 && (lo >= 0 || hi < this.count)) {
          if (hi < this.count) { this.load(hi); hi++; n++; }
          if (n < 6 && lo >= 0) { this.load(lo); lo--; n++; }
        }
        if (lo >= 0 || hi < this.count) setTimeout(fill, 50);
      };
      setTimeout(fill, 80);
    };
    return kick();
  }
  /* v2: widened, and jump-aware. A steady scrub (wheel/trackpad, or an
     anchor jump animated by Lenis, which still fires this every rAF as it
     eases through the intermediate frames) advances the frame index a few
     at a time — the original behind/ahead margins (4/10) were tuned for
     v1's steep hero-only ratio and are, if anything, generous for the
     gentler page-wide ratio now. What v1 never had to handle is an
     INSTANT jump with no intermediate scroll events: a mid-document hash
     load, Home/End, or Lenis simply being absent (reduced motion, touch).
     Those skip straight to a frame nothing nearby has loaded, so a large
     index delta since the last call gets a wide burst instead of the
     steady-state trickle. */
  prefetchAround(i) {
    const prevCenter = this._prefetchCenter;
    this._prefetchCenter = i;
    const jump = prevCenter == null ? Infinity : Math.abs(i - prevCenter);
    const wide = jump > 24;
    const behind = wide ? 16 : 5;
    const ahead = wide ? 16 : 12;
    for (let d = 0; d <= behind; d++) this.load(i - d);
    for (let d = 1; d <= ahead; d++) this.load(i + d);
  }
  /* unchanged from v1 — already scroll-distance agnostic (loads whatever
     remains, in order). The full document being longer only means MORE
     real scroll time elapses between this firing (p > 0.75) and p === 1,
     not less, so the same threshold is if anything safer here than it was
     scoped to the hero alone. */
  prefetchToEnd(from) {
    for (let j = from; j < this.count; j++) this.load(j);
  }
  redraw() {
    if (!this.resize()) return;
    const i = Math.round(this.displayIdx);
    this.lastStepIdx = -1;
    this.draw(i);
  }
  drawPoster() {
    if (!this.poster) return;
    const cw = this.canvas.width, ch = this.canvas.height;
    const img = this.poster;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }
  nearestLoaded(i) {
    if (this.loaded.has(i)) return i;
    for (let d = 1; d <= 2; d++) {
      if (this.loaded.has(i - d)) return i - d;
      if (this.loaded.has(i + d)) return i + d;
    }
    return this.painted >= 0 ? this.painted : -1;
  }
  /* size backing store from the canvas's own rendered box — NOT
     innerWidth/innerHeight, which change when a URL bar collapses/expands
     and would stretch the drawn image.
     Returns false when nothing changed so scroll-time events are no-ops.

     The ratio clamp is the important part. This used to take min(dpr, 2)
     unconditionally, so a 1440px laptop at DPR 2 asked for a 2880px-wide
     canvas and every single draw upscaled a 1600px frame by ~1.8x — over
     three times the fill rate, for detail the source does not contain.
     Clamping so the cover-fit scale never exceeds 1 costs nothing visually
     (the compositor performs the final scale instead of drawImage, with the
     same filtering) and is the largest single smoothness win on the cover. */
  resize() {
    const cw = this.canvas.clientWidth;
    const chh = this.canvas.clientHeight;
    if (!cw || !chh) return false;
    let dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.frameW && this.frameH) {
      const s = Math.max((cw * dpr) / this.frameW, (chh * dpr) / this.frameH);
      if (s > 1) dpr = Math.max(1, dpr / s);
    }
    const w = Math.round(cw * dpr);
    const h = Math.round(chh * dpr);
    if (w === this.canvas.width && h === this.canvas.height) return false;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    return true;
  }
  draw(i) {
    const j = this.nearestLoaded(i);
    if (j < 0) {
      if (this.poster && this.painted < 0) this.drawPoster();
      return;
    }
    this.painted = j;
    const img = this.images[j];
    const cw = this.canvas.width, ch = this.canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);

    const seam = SEAM_CONFIG.seamFrame;
    drawGlitch(this.ctx, img, i, seam, cw, ch);

    const flashAlpha = seamFlashAlpha(i, seam);
    if (flashAlpha > 0) {
      const { bloomCenterX, bloomCenterY, bloomEdgeAlpha, color } = SEAM_CONFIG;
      const cx = cw * bloomCenterX, cy = ch * bloomCenterY;
      const radius = Math.hypot(cw, ch) * 0.55;
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      g.addColorStop(0, rgbaAlpha(color, flashAlpha));
      g.addColorStop(1, rgbaAlpha(color, flashAlpha * bloomEdgeAlpha));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }

    const gradeAlpha = seamGradeAlpha(i, seam);
    if (gradeAlpha > 0) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = rgbaAlpha(SEAM_CONFIG.gradeColor, gradeAlpha);
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }

    if (this.glitchEl) {
      this.glitchEl.classList.toggle(
        'is-glitching',
        Math.abs(i - seam) < SEAM_CONFIG.glitch.windowFrames
      );
      this.glitchEl.classList.toggle('is-post-seam', i >= seam);
    }

    /* the misregistration beat fires once on the forward pass across the
       seam frame, and re-arms itself if the reader scrubs back below it —
       scrubbing past the seam a second time should feel the same both ways */
    const crossedNow = i >= seam;
    if (crossedNow !== this._seamCrossed) {
      this._seamCrossed = crossedNow;
      if (crossedNow && typeof this.onSeamCross === 'function') this.onSeamCross();
    }
  }
  /* v2: p is now PAGE-WIDE progress (0 at the top of 00 Cover, 1 at the
     bottom of 04 Close) instead of hero-only progress — see the orbit
     spine section below for the ScrollTrigger that produces it. The
     mapping itself (frame = p * (count-1)) doesn't change; only what p
     means does. */
  setProgress(p) {
    this.targetIdx = p * (this.count - 1);
    const i = Math.round(this.targetIdx);
    this.prefetchAround(i);
    if (p > 0.75) this.prefetchToEnd(i);
  }
  /* The smoothing lives in ScrollTrigger's scrub now. The old `delta * 0.4`
     lerp was per-rAF, so it caught up roughly twice as fast on a 120Hz
     display as on a 60Hz one — the same page felt like two different
     animations. scrub is time-based and frame-rate normalised. Keeping both
     would just stack two lags, so this only paints when the index changes. */
  step() {
    this.displayIdx = this.targetIdx;
    const i = Math.round(this.displayIdx);
    const needsUpgrade = this.loaded.has(i) && this.painted !== i;
    if (i !== this.lastStepIdx || needsUpgrade) {
      this.lastStepIdx = i;
      this.draw(i);
    }
  }
}

/* ---------- i18n (EN / DE) ---------- */
const I18N = {
  en: {
    'nav.cta': 'Start a project',
    'nav.cv': 'Download CV',
    'nav.experience': 'Experience',
    'nav.skip': 'Skip to work',
    'nav.langAria': 'Switch language',
    'hero.kicker': 'BRIEF RG-2026 · SHEET 00',
    'hero.sub': 'Software Engineer · AI Orchestrator · Designer · Creator',
    'hero.cv': 'Download CV',
    'hero.experience': 'Experience & documents →',
    'hero.scroll': 'OPEN BRIEF',
    'meta.subject': 'SUBJECT',
    'meta.station': 'STATION',
    'meta.field': 'FIELD',
    'meta.fieldVal': 'ENGINEERING · AI · DESIGN',
    'meta.period': 'PERIOD',
    'meta.contents': 'CONTENTS',
    'meta.contentsVal': '4 SHEETS · 4 PROJECTS · 6 DISCIPLINES',
    'sum.title': 'Summary',
    'sum.lede': 'Ten years turning ideas into software that ships. I work the whole pipeline — architecture, interface, motion, and the AI systems that automate the rest — so a project never waits on a handoff.',
    'sum.statusKey': 'STATUS',
    'sum.statusVal': 'BASED IN KLAGENFURT, AUSTRIA · EU / REMOTE',
    'stats.years': 'Years building',
    'stats.projects': 'Projects shipped',
    'stats.languages': 'Languages spoken',
    'stats.pipeline': 'Whole pipeline',
    'cap.title': 'Capability',
    'cap.plate': 'PLATE A · STUDIO',
    'work.title': 'Selected work',
    'close.kicker': 'END OF BRIEF · RG-2026',
    'xref.key': 'SEE ALSO',
    'xref.desc': '4 roles · 2 degrees · 5 verified documents',
    'bar.aria': 'Jump by sheet',
    'bar.brief': 'BRIEF',
    'bar.sheet': 'SHEET',
    'bar.s1': 'Summary',
    'bar.s2': 'Capability',
    'bar.s3': 'Work',
    'bar.s4': 'Close',
    'footer.docs': 'Documents',
    'pillars.kicker': 'WHAT I DO',
    'pillars.engineer.title': 'ENGINEER',
    'pillars.engineer.body': 'Production software, end to end. Clean systems that scale — from architecture to the last commit.',
    'pillars.orchestrate.title': 'ORCHESTRATE',
    'pillars.orchestrate.body': 'AI agents and pipelines that do real work. I turn model capabilities into automated products.',
    'pillars.design.title': 'DESIGN & CREATE',
    'pillars.design.body': 'Cinematic web experiences and content people remember. Design, motion, story — one craft.',
    'pillars.strip.branding': 'Branding',
    'pillars.strip.graphic': 'Graphic Design',
    'pillars.strip.ai': 'AI Content',
    'pillars.strip.social': 'Social Media',
    'pillars.strip.motion': 'Motion',
    'pillars.strip.video': 'Video',
    'work.kicker': 'SELECTED WORK',
    'work.meridian': 'Luxury alpine resort site — scroll-scrubbed canvas arrival, four interactive instruments, eight bespoke routes.',
    'work.sonnwerk': 'Premium CBD brand site — field-to-bottle storytelling, editorial type, scroll narrative.',
    'work.urologie': 'Medical boutique practice site for Dr. Danijel Jozipovic — calm precision, booking-led.',
    'work.eduHub': 'Study-abroad consultancy landing — guidance-focused scroll experience for international students.',
    'work.tag.hosp': 'Hospitality · Experience',
    'work.tag.brand': 'Brand · Scrollytelling',
    'work.tag.health': 'Healthcare · Landing',
    'work.tag.edu': 'Education · Landing',
    'work.cta': 'View project →',
    'cursor.view': 'VIEW ↗',
    'finale.line1': "LET'S BUILD",
    'finale.line2': 'SOMETHING',
    'finale.line3': 'UNFORGETTABLE',
    'finale.cta': 'Start a project',
    'finale.cv': 'Download CV',
    'footer.copy': '© 2026 Rustam Gurbanov',
    'footer.cv': 'CV',
    'footer.portfolio': 'Portfolio',
    'whatsapp.aria': 'Chat on WhatsApp'
  },
  de: {
    'nav.cta': 'Projekt starten',
    'nav.cv': 'Lebenslauf laden',
    'nav.experience': 'Erfahrung',
    'nav.skip': 'Zu den Arbeiten springen',
    'nav.langAria': 'Sprache wechseln',
    'hero.kicker': 'DOSSIER RG-2026 · BLATT 00',
    'hero.sub': 'Softwareentwickler · KI-Orchestrator · Designer · Creator',
    'hero.cv': 'Lebenslauf laden',
    'hero.experience': 'Erfahrung & Dokumente →',
    'hero.scroll': 'DOSSIER ÖFFNEN',
    'meta.subject': 'PERSON',
    'meta.station': 'STANDORT',
    'meta.field': 'BEREICH',
    'meta.fieldVal': 'ENTWICKLUNG · KI · DESIGN',
    'meta.period': 'ZEITRAUM',
    'meta.contents': 'INHALT',
    'meta.contentsVal': '4 BLÄTTER · 4 PROJEKTE · 6 DISZIPLINEN',
    'sum.title': 'Überblick',
    'sum.lede': 'Zehn Jahre, in denen aus Ideen Software wurde, die live geht. Ich übernehme die ganze Pipeline — Architektur, Interface, Motion und die KI-Systeme, die den Rest automatisieren — so wartet ein Projekt nie auf eine Übergabe.',
    'sum.statusKey': 'STATUS',
    'sum.statusVal': 'BASIS KLAGENFURT, ÖSTERREICH · EU / REMOTE',
    'stats.years': 'Jahre Erfahrung',
    'stats.projects': 'Projekte geliefert',
    'stats.languages': 'Gesprochene Sprachen',
    'stats.pipeline': 'Ganze Pipeline',
    'cap.title': 'Fähigkeiten',
    'cap.plate': 'TAFEL A · STUDIO',
    'work.title': 'Ausgewählte Arbeiten',
    'close.kicker': 'ENDE DES DOSSIERS · RG-2026',
    'xref.key': 'SIEHE AUCH',
    'xref.desc': '4 Stationen · 2 Abschlüsse · 5 geprüfte Dokumente',
    'bar.aria': 'Nach Blatt springen',
    'bar.brief': 'DOSSIER',
    'bar.sheet': 'BLATT',
    'bar.s1': 'Überblick',
    'bar.s2': 'Fähigkeiten',
    'bar.s3': 'Arbeiten',
    'bar.s4': 'Kontakt',
    'footer.docs': 'Dokumente',
    'pillars.kicker': 'WAS ICH MACHE',
    'pillars.engineer.title': 'ENGINEER',
    'pillars.engineer.body': 'Produktionssoftware, Ende zu Ende. Saubere Systeme die skalieren — von der Architektur bis zum letzten Commit.',
    'pillars.orchestrate.title': 'ORCHESTRATE',
    'pillars.orchestrate.body': 'KI-Agenten und Pipelines die echte Arbeit erledigen. Ich mache aus Modellfähigkeiten automatisierte Produkte.',
    'pillars.design.title': 'DESIGN & CREATE',
    'pillars.design.body': 'Filmische Web-Erlebnisse und Content den man behält. Design, Motion, Story — ein Handwerk.',
    'pillars.strip.branding': 'Branding',
    'pillars.strip.graphic': 'Grafikdesign',
    'pillars.strip.ai': 'KI-Content',
    'pillars.strip.social': 'Social Media',
    'pillars.strip.motion': 'Motion',
    'pillars.strip.video': 'Video',
    'work.kicker': 'AUSGEWÄHLTE ARBEITEN',
    'work.meridian': 'Luxus-Alpenresort-Website — scroll-gescrubbte Canvas-Ankunft, vier interaktive Instrumente, acht maßgefertigte Routen.',
    'work.sonnwerk': 'Premium-CBD-Markenseite — Storytelling vom Feld zur Flasche, editorial Typo, Scroll-Narrativ.',
    'work.urologie': 'Medizinische Boutique-Praxis-Website für Dr. Danijel Jozipovic — ruhige Präzision, buchungsgeführt.',
    'work.eduHub': 'Landingpage für Studienberatung — guidance-fokussiertes Scroll-Erlebnis für internationale Studierende.',
    'work.tag.hosp': 'Hospitality · Experience',
    'work.tag.brand': 'Brand · Scrollytelling',
    'work.tag.health': 'Healthcare · Landing',
    'work.tag.edu': 'Education · Landing',
    'work.cta': 'Projekt ansehen →',
    'cursor.view': 'ANSEHEN ↗',
    'finale.line1': 'LASS UNS',
    'finale.line2': 'ETWAS',
    'finale.line3': 'UNVERGESSLICHES BAUEN',
    'finale.cta': 'Projekt starten',
    'finale.cv': 'Lebenslauf laden',
    'footer.copy': '© 2026 Rustam Gurbanov',
    'footer.cv': 'CV',
    'footer.portfolio': 'Portfolio',
    'whatsapp.aria': 'Per WhatsApp chatten'
  }
};

const LANG_KEY = 'rg-lang';
let currentLang = localStorage.getItem(LANG_KEY) === 'de' ? 'de' : 'en';

const applyLang = (lang) => {
  currentLang = lang === 'de' ? 'de' : 'en';
  localStorage.setItem(LANG_KEY, currentLang);
  document.documentElement.lang = currentLang;
  const dict = I18N[currentLang];
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] != null) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (dict[key] != null) el.setAttribute('aria-label', dict[key]);
  });
  /* the reticle's legend (cursor.js reads dataset.cursorLabel at hover time,
     so translating the attribute here is enough — no re-binding needed) */
  document.querySelectorAll('[data-i18n-cursor]').forEach((el) => {
    const key = el.getAttribute('data-i18n-cursor');
    if (dict[key] != null) el.dataset.cursorLabel = dict[key];
  });
  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', currentLang === 'de' ? 'true' : 'false');
  }
};

applyLang(currentLang);
const langToggle = document.getElementById('lang-toggle');
if (langToggle) {
  langToggle.addEventListener('click', () => applyLang(currentLang === 'en' ? 'de' : 'en'));
}

/* ---------- 00 · the orbit spine + hero text entrance ----------
   v2 SPLITS what was one hero-scoped ScrollTrigger (v1) into two
   independent ones:

   1. THE ORBIT SPINE — the flipbook canvas, now driven by PAGE progress
      (00 Cover → 04 Close), not hero progress. See the markup contract
      called out in the file banner comment at the top of this file
      (#orbit-spine, <html>.has-orbit-spine). #orbit-canvas keeps its id;
      this file does not care which element is its parent.

   2. THE HERO TEXT ENTRANCE — kicker, per-character name, sub, metadata
      rows, actions, hint. Unchanged in substance from v1: still one
      hero-scoped ScrollTrigger (trigger: hero, start/end computed from
      .hero__sticky's own height — now text-only), still the same
      CONFIG.heroScrub fractions. Only the canvas/gauge are gone from it.

   Both are gated by the same wantsScrub decision as v1 — SCRUB_MQ width/
   aspect ratio, GSAP present, prefers-reduced-motion absent. Below that
   gate mobile still takes the still-cover branch, unchanged, and still
   downloads zero frames: the orbit spine is only ever constructed on the
   desktop/scrub path. */
const orbitCanvas = document.getElementById('orbit-canvas');
const hero = document.getElementById('hero');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (hero) {
  document.querySelectorAll('[data-line]').forEach(line => {
    line.innerHTML = [...line.textContent].map(c => `<span class="ch">${c}</span>`).join('');
  });
  const chars = [...document.querySelectorAll('.hero__name .ch')];
  const heroName = document.getElementById('hero-name');
  const heroSticky = hero.querySelector('.hero__sticky');
  const kicker = document.querySelector('.hero__kicker');
  const sub = document.getElementById('hero-sub');
  const metaRows = [...document.querySelectorAll('.hero__meta-row')];
  const actions = document.getElementById('hero-actions');
  const hint = document.getElementById('hero-hint');
  const idFig = hero.querySelector('.hero__id');
  const gaugeCur = document.getElementById('gauge-cur');
  const gaugeTotal = document.getElementById('gauge-total');
  const S = CONFIG.heroScrub;

  /* Which cover? The flipbook needs a wide landscape viewport, GSAP, and a
     user who has not asked for less motion. Anything else gets the still
     cover — which is a real cover with its own ID portrait, not a fallback. */
  const wantsScrub = scrubMQ.matches && gsapReady && !reduced && !!orbitCanvas;
  /* leaves a readable answer in the DOM for QA — which cover was chosen, and
     what the viewport looked like when it was chosen */
  hero.dataset.cover = wantsScrub ? 'scrub' : 'still';
  /* v2: single source of truth for "is the orbit spine live" so CSS can
     hide #orbit-spine entirely without it — the document-wide equivalent
     of hero.dataset.cover above. */
  document.documentElement.classList.toggle('has-orbit-spine', wantsScrub);

  if (!wantsScrub) {
    /* ---------- the still cover ----------
       Unchanged from v1: mobile and portrait tablets get the static ID
       portrait and download zero frames, regardless of how many sections
       the orbit spine would otherwise span on desktop. */
    hero.classList.add('hero--still');
    if (heroName) heroName.classList.add('is-post-seam');
    if (actions) actions.style.pointerEvents = 'auto';

    const show = [kicker, sub, actions, idFig].filter(Boolean);
    if (gsapReady && !reduced) {
      /* a one-shot entrance, not a scroll-linked one — nothing here is
         allowed to depend on scroll position, which is the whole point */
      gsap.set(chars, { yPercent: 110, y: 0, opacity: 0 });
      gsap.set(show, { opacity: 0 });
      gsap.set(metaRows, { opacity: 0 });
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .to(kicker, { opacity: 1, duration: 0.6 }, 0.05)
        .to(chars, { yPercent: 0, y: 0, opacity: 1, duration: 0.9, stagger: 0.028 }, 0.12)
        .to(sub, { opacity: 1, duration: 0.7 }, 0.55)
        .to(idFig, { opacity: 1, duration: 0.9 }, 0.4)
        .to(metaRows, { opacity: 1, duration: 0.5, stagger: 0.06 }, 0.7)
        .to(actions, { opacity: 1, duration: 0.6 }, 1.0);
    } else {
      /* reduced motion, or no GSAP: the finished state, immediately */
      const set = (el, css) => { if (el) Object.assign(el.style, css); };
      chars.forEach((c) => set(c, { transform: 'none', opacity: 1, transition: 'none' }));
      show.forEach((el) => set(el, { opacity: 1 }));
      metaRows.forEach((r) => set(r, { opacity: 1 }));
      const stripEarly = document.querySelector('.pillars__strip');
      if (stripEarly) stripEarly.classList.add('is-visible');
    }
  } else {
    /* ---------- the hero text entrance (hero-scoped, unchanged fractions) ---------- */
    const heroClock = { p: 0 };
    const heroTl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: () => '+=' + Math.max(1, hero.offsetHeight - heroSticky.offsetHeight),
        scrub: 0.55,
        invalidateOnRefresh: true
      }
    });

    /* the clock: total duration 1, so every position below reads directly
       as a fraction of HERO progress and CONFIG.heroScrub stays meaningful
       — this is deliberately a SEPARATE clock from the orbit spine's below,
       since the two now run on different scroll ranges entirely */
    heroTl.to(heroClock, { p: 1, duration: 1 }, 0);

    /* beat 1 — the name writes itself in, character by character */
    const charSpan = Math.max(0.02, S.nameRevealEnd - 0.06);
    /* y:0 on both ends — CSS parks .ch at translateY(110%), GSAP reads that
       back as ~48 pixels, and yPercent alone would leave the residual
       inside an overflow:hidden line box */
    heroTl.fromTo(chars,
      { yPercent: 110, y: 0, opacity: 0 },
      { yPercent: 0, y: 0, opacity: 1, duration: 0.06,
        stagger: charSpan / Math.max(1, chars.length - 1) }, 0);

    if (kicker) heroTl.fromTo(kicker, { opacity: 0 }, { opacity: 1, duration: 0.035 }, S.kickerRevealAt);
    if (sub) heroTl.fromTo(sub, { opacity: 0 }, { opacity: 1, duration: 0.045 }, S.subRevealAt);

    /* beat 1b — metadata rows write in one at a time, staggered by SCROLL
       position rather than by a timer, so scrubbing back un-writes them */
    if (metaRows.length) {
      const span = Math.max(0.02, S.metaEnd - S.metaStart);
      heroTl.fromTo(metaRows, { opacity: 0 },
        { opacity: 1, duration: span / 2,
          stagger: (span / 2) / Math.max(1, metaRows.length - 1) }, S.metaStart);
    }
    if (actions) heroTl.fromTo(actions, { opacity: 0 }, { opacity: 1, duration: 0.05 }, S.actionsRevealAt);
    if (hint) heroTl.fromTo(hint, { opacity: 1 }, { opacity: 0, duration: 0.035 }, S.hintFadeAt);

    /* the canvas and film gauge used to ride this same ticker in v1 — they
       are gone from here; see "the orbit spine" below. This ticker now
       only flips the actions block's pointer-events once it's visible,
       gated on the SAME hero-only clock the tween above uses. */
    if (actions) {
      let actionsOn = null;
      gsap.ticker.add(() => {
        const on = heroClock.p > S.actionsRevealAt;
        if (on !== actionsOn) {
          actionsOn = on;
          actions.style.pointerEvents = on ? 'auto' : 'none';
        }
      });
    }

    /* ---------- the orbit spine ----------
       One ScrollTrigger for the ENTIRE document: 00 Cover's top to 04
       Close's bottom. frame 1 → count maps linearly onto page progress
       0 → 1 — front, through three-quarter, all the way around and back
       to front — so SEAM_CONFIG.seamFrame (~160/360, per LOG.md) now
       lands wherever that frame fraction falls on the WHOLE document
       (SEAM_CONFIG.seamProgress, computed above) instead of always inside
       the cover. Phase 2: the sheets' own entry motion (below, its own
       top-level IIFE) rides the same scroll rather than this orbitClock
       directly — see that IIFE's banner comment for why. */
    const scrubber = new FlipbookScrubber(orbitCanvas, CONFIG.frames, heroName);
    if (gaugeTotal) gaugeTotal.textContent = String(scrubber.count);

    const orbitClock = { p: 0 };
    const orbitTl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.55,
        invalidateOnRefresh: true
      }
    });
    orbitTl.to(orbitClock, { p: 1, duration: 1 }, 0);

    /* seed the frame set from wherever the page actually starts, not
       frame 0 — see FlipbookScrubber.preload()'s comment. ScrollTrigger
       has already measured the current scroll position synchronously
       above; if that measurement is off (layout not fully settled yet)
       the very first real tick below corrects it via prefetchAround, so
       this is a head start, not a hard requirement. */
    const initialSt = orbitTl.scrollTrigger;
    const startProgress = initialSt ? initialSt.progress : 0;
    const startIdx = Math.round(startProgress * (scrubber.count - 1));
    scrubber.preload(startIdx);

    /* The canvas rides gsap.ticker — the same clock Lenis and ScrollTrigger
       already share, so there is exactly one rAF loop on the page. All
       writes below are gated on an actual change. */
    let lastLabel = '';
    gsap.ticker.add(() => {
      scrubber.setProgress(orbitClock.p);
      scrubber.step();

      if (gaugeCur) {
        const n = Math.min(scrubber.count, Math.round(orbitClock.p * (scrubber.count - 1)) + 1);
        const label = String(n).padStart(3, '0');
        if (label !== lastLabel) { lastLabel = label; gaugeCur.textContent = label; }
      }
    });

    /* ---------- Phase 2: the 1px misregistration beat ----------
       Replaces v1's CRT chromatic-aberration glitch at the seam (see the
       .hero__line--accent comment in style-v2.css). FlipbookScrubber
       already toggles heroName's .is-glitching/.is-post-seam every frame
       near/at the seam (Phase 1, unchanged); this adds a ONE-SHOT snap the
       instant the drawn frame crosses SEAM_CONFIG.seamFrame — two elements
       mis-set by 1px against each other, like a print plate landing a hair
       off-register, then correcting.

       WHERE it lands is checked at runtime, not assumed — and the first
       thing checked turned out to be wrong. heroTl.scrollTrigger.end only
       marks when .hero__sticky's CSS `position:sticky` releases (~2610px at
       a 1440×900 viewport); it does NOT mark when the hero text leaves the
       screen. .hero__content is bottom-anchored inside .hero__sticky
       (justify-content:flex-end), so once it un-sticks it keeps scrolling
       with the document — and measuring it directly (getBoundingClientRect
       at the seam's actual scroll position) shows #hero-name is still ~150px
       into the viewport there, comfortably before #stats has even arrived
       (confirmed empirically at 1440×900: seam scrollY≈3192, #stats
       top≈3570). So the real boundary is "has #stats arrived yet", which is
       also the more honest thing to measure — it's a live DOM read, not a
       second derived ScrollTrigger pixel value that can drift out of sync
       with the first. SEAM_CONFIG.seamProgress (~0.443, computed above from
       seamFrame/359) maps to a scrollY via orbitTl's own document-wide
       trigger — that's the trigger the fraction was authored against, so
       it's the correct one to invert. */
    scrubber.onSeamCross = () => {
      const st = orbitTl.scrollTrigger;
      const statsEl = document.getElementById('stats');
      if (!st || !statsEl) return;
      const seamY = st.start + SEAM_CONFIG.seamProgress * (st.end - st.start);
      const statsTop = statsEl.getBoundingClientRect().top + window.scrollY;
      const heroStillActive = seamY < statsTop;
      const targets = heroStillActive
        ? [...document.querySelectorAll('.hero__line')]
        : [document.getElementById('stats'), document.getElementById('pillars')].filter(Boolean);
      if (targets.length < 2) return;
      gsap.killTweensOf(targets);
      gsap.timeline()
        .set(targets, { x: 0 })
        .to(targets[0], { x: -1, duration: 0.05, ease: 'none' }, 0)
        .to(targets[1], { x: 1, duration: 0.05, ease: 'none' }, 0)
        .to(targets, { x: 0, duration: 0.16, ease: 'power2.out' }, 0.05);
    };
  }

  /* Crossing the scrub/still threshold (a rotation, or a window dragged past
     900px) swaps which cover is correct, and neither can be rebuilt in place
     — the still one has no canvas and the scrubbed one has no portrait.

     The same check also self-corrects a decision made too early. main-v2.js
     runs at the end of <body>, which is normally after layout has settled,
     but not always: a panel that animates open, a window restoring its
     size, devtools docking, all resize the viewport a beat later. Getting
     it wrong used to be permanent — the still cover would sit there on a
     wide desktop with no way back. The sessionStorage latch means one
     correction, never a loop. */
  const RETRY_KEY = 'rg-cover-retry';
  let mqTimer = 0;
  const recheck = () => {
    clearTimeout(mqTimer);
    mqTimer = setTimeout(() => {
      const want = scrubMQ.matches && gsapReady && !reduced && !!orbitCanvas;
      if (want === wantsScrub) return;
      let tries = 0;
      try { tries = +sessionStorage.getItem(RETRY_KEY) || 0; } catch (e) { tries = 99; }
      if (tries >= 2) return;
      try { sessionStorage.setItem(RETRY_KEY, String(tries + 1)); } catch (e) { /* private mode: just don't retry */ }
      location.reload();
    }, 350);
  };
  if (scrubMQ.addEventListener) scrubMQ.addEventListener('change', recheck);
  addEventListener('load', recheck);
  /* clear the latch once a load has stood unchanged for a few seconds, so a
     later genuine rotation still gets its one correction */
  setTimeout(() => { try { sessionStorage.removeItem(RETRY_KEY); } catch (e) {} }, 4000);
}

/* ---------- 02 · capability: staggered entry, no exit ----------
   zeus's markup structurally unpinned this sheet — no .pillars__sticky, all
   three pillars sit in the DOM together (forced by the content-lock diff
   conflict; see the HTML banner above #pillars). There is no "step" state
   left to drive: the old pin/step machinery above pinned the section and
   revealed one pillar at a time as you scrolled through it. What replaces
   it is just an entrance — the three items stagger in once, on the way
   past, and then stay. No re-hiding, no scroll-linked step.

   The stagger DIRECTION follows the same 1024px breakpoint CSS switches
   layout on (.pillars__list grid-template-columns): three-up on desktop
   staggers left-to-right across the row; the stacked ruled list below it
   staggers top-to-bottom like every other reveal in this file. */
(() => {
  const section = document.getElementById('pillars');
  if (!section || !gsapReady) return;
  const pillars = gsap.utils.toArray('.pillar', section);
  if (!pillars.length) return;

  const mm = gsap.matchMedia();
  mm.add(
    {
      isMotion: '(prefers-reduced-motion: no-preference)',
      reduceMotion: '(prefers-reduced-motion: reduce)',
      threeUp: '(min-width: 1024px)'
    },
    (context) => {
      const { reduceMotion, threeUp } = context.conditions;
      if (reduceMotion) return; /* markup is already the finished state */

      gsap.set(pillars, { autoAlpha: 0, y: threeUp ? 0 : 26, x: threeUp ? -18 : 0 });

      ScrollTrigger.create({
        trigger: section,
        start: 'top 78%',
        once: true,
        onEnter: () => {
          gsap.to(pillars, {
            autoAlpha: 1, y: 0, x: 0,
            duration: 0.75, ease: 'power3.out', stagger: 0.14
          });
        }
      });

      /* the breakpoint can flip mid-session (a rotation, a resized window);
         if the entry already fired, clearProps leaves the finished state
         intact instead of yanking pillars back to a stale hidden offset */
      return () => { gsap.set(pillars, { clearProps: 'opacity,visibility,transform' }); };
    }
  );
})();

/* ---------- 03 · selected work: reveal-in ----------
   Every reveal is a ScrollTrigger created INSIDE mm.add() — matchMedia
   reverts GSAP objects on breakpoint change but does NOT remove raw
   addEventListener handlers, so the old hover-binding pattern stacked
   duplicates each time you crossed 769px. */
(() => {
  const section = document.getElementById('work');
  if (!section || !gsapReady) return;
  const rows = gsap.utils.toArray('.worx__row', section);
  if (!rows.length) return;

  const mm = gsap.matchMedia();
  mm.add(
    {
      isMotion: '(prefers-reduced-motion: no-preference)',
      reduceMotion: '(prefers-reduced-motion: reduce)'
    },
    (context) => {
      if (context.conditions.reduceMotion) {
        rows.forEach((el) => el.classList.add('is-in'));
        return;
      }
      rows.forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          once: true,
          onEnter: () => el.classList.add('is-in')
        });
      });
    }
  );

  /* The posters used to be position:absolute inside a fixed-height frame, so
     a late lazy decode cost nothing. In flow they would shift every trigger
     start computed below them, so each plate carries width/height + a CSS
     aspect-ratio. This refresh is the belt to that braces. */
  const imgs = [...section.querySelectorAll('.plate img')];
  let pending = imgs.filter((im) => !im.complete).length;
  if (pending) {
    imgs.forEach((im) => {
      if (im.complete) return;
      const done = () => { if (--pending === 0) ScrollTrigger.refresh(); };
      im.addEventListener('load', done, { once: true });
      im.addEventListener('error', done, { once: true });
    });
  }
})();

/* ---------- 03 · selected work: the preview crossfade ----------
   v1's flying float card (above, now deleted) AND its separate sticky
   closer.mp4 plate are both gone. #worx-preview is the ONE window zeus's
   markup leaves in the reserve column: idle it shows the studio loop
   (closer.mp4, painted by the shared [data-video] machinery further down
   this file into .plate__frame-layer--idle — that machinery doesn't know or
   care that this is a "preview," it just sees another [data-video] holder).
   Hovering or focusing a .worx__row crossfades a poster in immediately, then
   a clip once it can play, over that idle layer — CSS owns the crossfade
   itself via .worx__preview-poster.is-active / .worx__preview-video.is-active
   (both opacity transitions, both already null under prefers-reduced-motion
   per style-v2.css). Leaving/blurring crossfades back to idle.

   Coarse pointers never get a hover, so per apollo's packet they get the row
   nearest the viewport centre instead, recomputed on scroll. */
(() => {
  const section = document.getElementById('work');
  const frame = document.getElementById('worx-preview-frame');
  const posterEl = document.getElementById('worx-preview-poster');
  const labelEl = document.getElementById('worx-preview-label');
  const srcEl = document.getElementById('worx-preview-src');
  const rows = section ? gsap.utils.toArray('.worx__row', section) : [];
  if (!section || !frame || !posterEl || !rows.length) return;
  if (typeof gsap === 'undefined') return; /* no GSAP: rows keep their inline .worx__media posters */

  /* captured once, before any hover ever touches them — this is what "back
     to idle" restores, in whatever language is currently active */
  const idleLabel = labelEl ? labelEl.textContent : '';
  const idleSrc = srcEl ? srcEl.textContent : '';

  const canHover = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

  let previewVideo = null; // one <video>, re-sourced per row rather than one per row
  let currentRow = null;
  let leaveTimer = 0;

  function ensureVideo() {
    if (previewVideo) return previewVideo;
    const v = document.createElement('video');
    v.className = 'worx__preview-video';
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    frame.appendChild(v);
    previewVideo = v;
    return v;
  }

  function activate(row) {
    if (!row || row === currentRow) return;
    clearTimeout(leaveTimer);
    currentRow = row;

    if (row.dataset.poster) {
      posterEl.src = row.dataset.poster;
      const name = row.querySelector('.worx__name');
      posterEl.alt = name ? name.textContent : '';
      posterEl.classList.add('is-active');
    }
    if (labelEl) labelEl.textContent = row.dataset.capLabel || idleLabel;
    if (srcEl) srcEl.textContent = row.dataset.capSrc || idleSrc;

    if (previewVideo) previewVideo.classList.remove('is-active');
    if (row.dataset.preview) {
      const v = ensureVideo();
      v.classList.remove('is-active');
      if (v.dataset.src !== row.dataset.preview) {
        v.dataset.src = row.dataset.preview;
        v.src = row.dataset.preview;
        v.preload = 'auto';
        v.load();
      }
      const show = () => { if (currentRow === row) v.classList.add('is-active'); };
      if (v.readyState >= 2) show();
      else v.addEventListener('loadeddata', show, { once: true });
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }

  function deactivate() {
    currentRow = null;
    posterEl.classList.remove('is-active');
    if (previewVideo) { previewVideo.classList.remove('is-active'); previewVideo.pause(); }
    if (labelEl) labelEl.textContent = idleLabel;
    if (srcEl) srcEl.textContent = idleSrc;
  }

  function scheduleDeactivate() {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(deactivate, 140);
  }

  rows.forEach((row) => {
    row.addEventListener('mouseenter', () => { if (canHover()) activate(row); });
    row.addEventListener('mouseleave', () => { if (canHover()) scheduleDeactivate(); });
    row.addEventListener('focusin', () => { if (canHover()) activate(row); });
    row.addEventListener('focusout', () => { if (canHover()) scheduleDeactivate(); });
  });

  /* coarse pointers: no hover exists to drive this, so the row nearest the
     viewport centre wins instead, re-checked on every scroll update. */
  if (!canHover() && gsapReady) {
    const nearestRow = () => {
      const mid = innerHeight / 2;
      let best = null, bestD = Infinity;
      rows.forEach((row) => {
        const r = row.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return; // off-screen — not a candidate
        const d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestD) { bestD = d; best = row; }
      });
      return best;
    };
    ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: () => {
        const r = nearestRow();
        if (r) activate(r); else deactivate();
      }
    });
    const initial = nearestRow();
    if (initial) activate(initial);
  }
})();

/* ---------- sheet-entry motion ----------
   Each paper sheet rises + fades in as its own trim gap clears the bottom of
   the viewport, so the reader sees it arrive OVER whatever is showing through
   that gap — the live orbit spine on the desktop/scrub path (apollo's "sheet
   01 slides up over the lower orbit field"), or just the flat field colour
   everywhere else. This is a per-sheet ScrollTrigger rather than a single
   read of Phase 1's orbitClock: orbitClock only exists inside the hero
   IIFE's wantsScrub branch (so it's unreachable here, and doesn't run at all
   on the still-cover path), whereas the sheets themselves are on every path.
   Both read the SAME underlying scroll — this is just the idiomatic way to
   express "ride the scroll" for a handful of independently-sized sections
   instead of hand-deriving each one's start/end fraction of one global timer.

   04 Close is excluded deliberately: it's theme-dark (the field itself, no
   trim — see .sheet.theme-dark in style-v2.css), so it already "clears back
   to full-bleed" by CSS alone and has no gap to rise out of. */
(() => {
  if (!gsapReady) return;
  const sheets = ['stats', 'pillars', 'work']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!sheets.length) return;

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    /* will-change is a compositor hint, not a permanent promise — leaving it
       set after the tween settles just holds a layer open for nothing. It
       goes on right as the sheet enters the trigger zone (about to animate)
       and comes off the instant it's no longer in that zone, whichever
       direction crossed it (forward past `end`, or back above `start`). */
    const hint = (on) => (self) => { self.trigger.style.willChange = on ? 'transform, opacity' : 'auto'; };
    sheets.forEach((sheet) => {
      gsap.fromTo(sheet,
        { y: 46, autoAlpha: 0.82 },
        {
          y: 0, autoAlpha: 1, ease: 'none',
          scrollTrigger: {
            trigger: sheet, start: 'top bottom', end: 'top 55%', scrub: 0.4,
            onEnter: hint(true), onEnterBack: hint(true),
            onLeave: hint(false), onLeaveBack: hint(false)
          }
        });
    });
    return () => { gsap.set(sheets, { clearProps: 'opacity,visibility,transform' }); sheets.forEach((s) => { s.style.willChange = 'auto'; }); };
  });
})();

/* ---------- the sheet counter: page progress + live sheet + theme flip ----------
   The homepage's own device. Horizontal where the CV's spine is vertical, and
   it counts sheets rather than years. */
(() => {
  const bar = document.getElementById('sheetbar');
  if (!bar || !gsapReady) return;
  const fill = document.getElementById('sheetbar-fill');
  const cur = document.getElementById('sheet-cur');
  const ticks = [...bar.querySelectorAll('.sheetbar__tick')];
  const root = document.documentElement;

  /* progress along the whole document */
  if (fill) {
    gsap.to(fill, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 }
    });
  }

  /* which sheet is under the reader, and is it paper or dark?
     Checked at the section's own midpoint rather than with an early
     rootMargin — an offset boundary is exactly how a chrome theme ends up
     flipping before the section it belongs to actually arrives. */
  const sheets = [
    { el: document.getElementById('hero'),    n: '00', paper: false },
    { el: document.getElementById('stats'),   n: '01', paper: true  },
    { el: document.getElementById('pillars'), n: '02', paper: true  },
    { el: document.getElementById('work'),    n: '03', paper: true  },
    { el: document.getElementById('contact'), n: '04', paper: false }
  ].filter((s) => s.el);

  /* setLive owns the READOUT only (sheet number + live tick). It must not
     touch the theme: several of these triggers can change state in a single
     update, and whichever fired last would win. */
  const setLive = (idx) => {
    const s = sheets[idx];
    if (!s) return;
    if (cur && cur.textContent !== s.n) cur.textContent = s.n;
    ticks.forEach((t) => t.classList.toggle('is-live', +t.dataset.sheet === idx));
  };

  sheets.forEach((s, i) => {
    ScrollTrigger.create({
      trigger: s.el,
      start: 'top center',
      end: 'bottom center',
      onToggle: (self) => { if (self.isActive) setLive(i); }
    });
  });
  setLive(0);

  /* THEME — exactly one trigger owns chrome-paper, spanning the whole paper
     band: from the moment the hero's pin releases into #stats, to the moment
     the dark close arrives. Both edges belong to the same trigger, so isActive
     is resolved from the final scroll position rather than from which edges
     got crossed. That matters: an earlier version used a start-edge onEnter
     plus a separate per-section writer, and jumping straight from the cover to
     #contact (which every sheet-counter link can do) fired the start edge,
     blew past the end edge, and left a paper counter on a dark screen. */
  const hero = document.getElementById('hero');
  const contact = document.getElementById('contact');
  if (hero && contact) {
    ScrollTrigger.create({
      trigger: hero,
      start: 'bottom top',
      endTrigger: contact,
      end: 'top center',
      onToggle: (self) => { root.classList.toggle('chrome-paper', self.isActive); }
    });
  }

  /* the topbar's ghost/bar switch needs a THIRD state chrome-paper alone
     can't express: chrome-paper is false both inside the hero (ghost, no
     bar) and past it over the dark Close section (a beige bar) — .past-hero
     tells those two apart. True from the instant #stats begins through the
     rest of the document; false only while still inside the hero. */
  if (hero) {
    ScrollTrigger.create({
      trigger: hero,
      start: 'bottom top',
      onEnter: () => root.classList.add('past-hero'),
      onLeaveBack: () => root.classList.remove('past-hero')
    });
  }
})();

/* ---------- 01 · summary: vitals counters + enter stagger ----------
   Driven by ScrollTrigger rather than IntersectionObserver so the whole page
   runs on one scroll system, and the markup already renders the final numbers
   so the sheet is correct with JS off. */
(() => {
  const section = document.getElementById('stats');
  if (!section || !gsapReady) return;
  const numbers = gsap.utils.toArray('.vital__n', section);
  const items = gsap.utils.toArray('.vital', section);
  if (!numbers.length) return;

  const countUp = () => {
    numbers.forEach((n) => {
      const target = +n.dataset.count;
      if (!Number.isFinite(target)) return;
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.5, ease: 'power2.out',
        onUpdate: () => { n.textContent = Math.round(obj.v); }
      });
    });
  };

  const mm = gsap.matchMedia();
  mm.add(
    {
      isMotion: '(prefers-reduced-motion: no-preference)',
      reduceMotion: '(prefers-reduced-motion: reduce)'
    },
    (context) => {
      if (context.conditions.reduceMotion) return; /* markup already shows finals */
      gsap.set(items, { autoAlpha: 0, y: 28 });
      ScrollTrigger.create({
        trigger: section,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          gsap.to(items, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1 });
          countUp();
        }
      });
    }
  );
})();

/* ---------- finale title enter ---------- */
(() => {
  if (!gsapReady) return;
  const title = document.querySelector('.close__title');
  if (!title) return;
  /* [data-close-line], deliberately NOT named data-line: that attribute is
     already used globally by the hero's char-split effect (this file,
     `document.querySelectorAll('[data-line]')` with no scoping), which would
     otherwise also catch these three and mangle them into per-character
     spans. */
  const lines = gsap.utils.toArray('[data-close-line]', title);
  if (!lines.length) return;

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.set(lines, { autoAlpha: 0, y: 36 });
    ScrollTrigger.create({
      trigger: title,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.to(lines, {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
          ease: 'power3.out',
          stagger: 0.12
        });
      }
    });
  });
})();

/* ---------- background video loops ---------- */
const bgVideos = new Map();
const playBgVideo = (v) => {
  if (!v || v.readyState < 2) return;
  const p = v.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
};
const videoVisible = new Map();
document.querySelectorAll('[data-video]').forEach(holder => {
  const v = document.createElement('video');
  v.muted = true;
  v.defaultMuted = true;
  v.loop = true;
  v.autoplay = true;
  v.playsInline = true;
  v.preload = 'auto';
  /* iOS requires the muted/playsinline ATTRIBUTES for autoplay of
     script-created videos — the IDL properties alone aren't enough */
  v.setAttribute('muted', '');
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  bgVideos.set(holder, v);
  /* battery-saver / low-power modes pause bg autoplay videos and paint an
     unreachable play overlay (video sits behind content). Retry while the
     section is on screen; the touch/pointer unlock below covers the rest. */
  v.addEventListener('pause', () => {
    if (document.hidden || !videoVisible.get(v) || v.ended) return;
    setTimeout(() => {
      if (!document.hidden && videoVisible.get(v)) playBgVideo(v);
    }, 250);
  });
  const mount = () => {
    if (!holder.contains(v)) {
      holder.innerHTML = '';
      holder.appendChild(v);
    }
    playBgVideo(v);
  };
  v.addEventListener('canplay', mount);
  v.addEventListener('loadeddata', mount);
  v.addEventListener('ended', () => { v.currentTime = 0; playBgVideo(v); });
  v.addEventListener('stalled', () => playBgVideo(v));
});
/* defer video downloads until their section approaches — they'd otherwise
   compete with the hero frame set for bandwidth on page load */
const lazyVideoIo = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    lazyVideoIo.unobserve(en.target);
    const v = bgVideos.get(en.target);
    if (!v) return;
    v.src = en.target.dataset.video;
    v.load();
  });
}, { rootMargin: '150% 0px' });
bgVideos.forEach((_, holder) => lazyVideoIo.observe(holder));
const resumeBgVideos = () => bgVideos.forEach(v => { if (videoVisible.get(v)) playBgVideo(v); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) resumeBgVideos(); });
window.addEventListener('pageshow', resumeBgVideos);
window.addEventListener('focus', resumeBgVideos);
/* any user gesture lifts autoplay/low-power blocks — retry paused videos */
window.addEventListener('touchstart', resumeBgVideos, { passive: true });
window.addEventListener('pointerdown', resumeBgVideos);
const videoIo = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    const v = bgVideos.get(en.target);
    if (!v) return;
    videoVisible.set(v, en.isIntersecting);
    if (en.isIntersecting) playBgVideo(v);
    else if (!v.paused) v.pause();
  });
}, { threshold: 0.05 });
bgVideos.forEach((_, holder) => videoIo.observe(holder));

/* The acid dot cursor is retired — it used mix-blend-mode:screen, which is
   invisible over the cream paper sheets, and a glowing blob fought a document
   that is otherwise precise. cv.html had already opted out. */

/* ---------- topbar: retract while reading down, return on scroll up ----------
   The bar is a solid chip on this page too, so it would otherwise sit on top
   of body copy. Deliberately not a theme flip: that is what made the header
   vanish at section boundaries in lab/005. */
(() => {
  const root = document.documentElement;
  const bar = document.querySelector('.brief-topbar');
  if (!bar || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let last = window.scrollY;
  addEventListener('scroll', () => {
    const y = window.scrollY;
    if (Math.abs(y - last) < 6) return;
    root.classList.toggle('bar-hidden', y > last && y > 220);
    last = y;
  }, { passive: true });
  /* never hide the bar from a keyboard user tabbing into it */
  bar.addEventListener('focusin', () => root.classList.remove('bar-hidden'));
})();

/* ---------- anchor scroll via lenis ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const href = a.getAttribute('href');
  if (href.length < 2) { e.preventDefault(); return; } /* bare "#" placeholder links */
  const t = document.querySelector(href);
  if (t) { e.preventDefault(); lenis ? lenis.scrollTo(t) : t.scrollIntoView({ behavior: 'smooth' }); }
}));

/* CV page reveals now live in cv.js / cv-v2.js */

/* TEMP PERF PROBE — hephaestus Phase 4, remove before handoff. Query-gated so
   it never runs on a normal load. Writes 1s FPS buckets + a running low-water
   mark into a fixed on-page readout (console proved unreliable to read back
   in this harness) for a real scroll-through measurement. */
if (location.search.includes('fpsdebug')) {
  const readout = document.createElement('div');
  readout.id = 'fps-probe-readout';
  readout.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;background:#000;color:#0f0;font:14px monospace;padding:4px 8px;';
  document.body.appendChild(readout);
  let last = performance.now(), frames = 0, minFps = Infinity, samples = 0, sumFps = 0;
  const tick = (t) => {
    frames++;
    if (t - last >= 1000) {
      const fps = Math.round((frames * 1000) / (t - last));
      minFps = Math.min(minFps, fps);
      samples++; sumFps += fps;
      readout.textContent = `fps=${fps} min=${minFps} avg=${Math.round(sumFps / samples)} n=${samples} y=${Math.round(window.scrollY)}`;
      frames = 0; last = t;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
