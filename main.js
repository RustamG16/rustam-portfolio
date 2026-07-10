/* =====================================================================
   SITE-ENGINE PROTOTYPE v0.1 — flipbook scrubber + PERSONA scaffold
   Everything below CONFIG is archetype-agnostic engine code.
   ===================================================================== */

const CONFIG = {
  frames: {
    path: 'frames/hero/frame_',   // + %04d + .webp
    ext: '.webp',
    count: 360,                   // desktop: orbit-a 8s + orbit-b(1) 10s @ 20fps
    pad: 4,
    mobilePath: 'frames/hero-mobile/frame_',
    mobileCount: 160,             // mobile: 10fps variant
    poster: 'media/poster.webp'
  },
  heroScrub: { nameRevealEnd: 0.18, subRevealAt: 0.12, hintFadeAt: 0.05 },
  pillarsSteps: 3
};

/* ---------- smooth scroll (Lenis, desktop wheel only) ---------- */
let lenis = null;
const isTouchDevice = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
try {
  if (window.Lenis && !matchMedia('(prefers-reduced-motion: reduce)').matches && !isTouchDevice) {
    lenis = new Lenis({ lerp: 0.09, smoothTouch: false });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
} catch (e) { /* native scroll fallback */ }

const SEAM_CONFIG = {
  seamFrame: 160,
  mobileSeamFrame: 80,
  buildFrames: 10,
  decayFrames: 18,
  peakOpacity: 0.3,
  color: 'rgba(80, 255, 190, 1)',
  gradeFrames: 24,
  gradePeak: 0.25,
  gradeColor: 'rgba(0, 20, 12, 1)',
  bloomCenterX: 0.7,
  bloomCenterY: 0.4,
  bloomEdgeAlpha: 0.15,
  glitch: {
    windowFrames: 8,
    maxChannelShift: 14,
    ghostAlpha: 0.5,
    maxSlices: 6,
    maxSliceHeight: 30,
    maxSliceOffset: 60,
    scanlineColor: 'rgba(80, 255, 190, 1)',
    scanlineAlpha: 0.35
  }
};

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

/* ---------- FlipbookScrubber ----------
   Canvas frame-sequence scrubber with:
   - coarse-first preloading (every 8th frame, then fill)
   - nearest-loaded-frame fallback while loading
   - cover-fit draw, devicePixelRatio aware                     */
class FlipbookScrubber {
  constructor(canvas, cfg, glitchEl = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cfg = cfg;
    this.glitchEl = glitchEl;
    this.isMobile = innerWidth < 768 && !!cfg.mobilePath;
    this.count = this.isMobile ? (cfg.mobileCount || cfg.count) : cfg.count;
    this.images = new Array(this.count).fill(null);
    this.loaded = new Set();
    this.current = -1;
    this.poster = null;
    this.resize();
    addEventListener('resize', () => { this.resize(); this.draw(this.current < 0 ? 0 : this.current); });
    if (cfg.poster) {
      const poster = new Image();
      poster.decoding = 'async';
      poster.onload = () => {
        this.poster = poster;
        if (this.current < 0) this.drawPoster();
      };
      poster.src = cfg.poster;
    }
    this.preload();
  }
  src(i) {
    const n = String(i + 1).padStart(this.cfg.pad, '0');
    const base = this.isMobile ? this.cfg.mobilePath : this.cfg.path;
    return `${base}${n}${this.cfg.ext}`;
  }
  load(i) {
    if (this.images[i]) return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      this.loaded.add(i);
      if (this.current === -1 && i === 0) this.draw(0);
      else if (i === this.current) this.draw(i);   // upgrade a fallback draw
    };
    img.src = this.src(i);
    this.images[i] = img;
  }
  preload() {
    this.load(0);
    const coarseStep = this.isMobile ? 4 : 8;
    const eagerEnd = this.isMobile ? 32 : 16;
    for (let i = 0; i < this.count; i += coarseStep) this.load(i);
    for (let i = 1; i < eagerEnd; i++) this.load(i);
    let i = 0;
    const batch = this.isMobile ? 12 : 6;
    const fill = () => {
      let done = 0;
      while (i < this.count && done < batch) { this.load(i); i++; done++; }
      if (i < this.count) setTimeout(fill, this.isMobile ? 16 : 60);
    };
    setTimeout(fill, this.isMobile ? 40 : 200);
  }
  prefetchAround(i) {
    const span = this.isMobile ? 20 : 12;
    for (let d = 0; d <= span; d++) {
      if (i - d >= 0) this.load(i - d);
      if (i + d < this.count) this.load(i + d);
    }
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
    for (let d = 1; d < this.count; d++) {
      if (this.loaded.has(i - d)) return i - d;
      if (this.loaded.has(i + d)) return i + d;
    }
    return -1;
  }
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
  }
  draw(i) {
    const j = this.nearestLoaded(i);
    if (j < 0) {
      if (this.poster) this.drawPoster();
      return;
    }
    this.current = i;
    const img = this.images[j];
    const cw = this.canvas.width, ch = this.canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);   // cover
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);

    const seam = this.isMobile ? SEAM_CONFIG.mobileSeamFrame : SEAM_CONFIG.seamFrame;
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
    }
  }
  setProgress(p) {
    const i = Math.max(0, Math.min(this.count - 1, Math.round(p * (this.count - 1))));
    this.prefetchAround(i);
    if (i !== this.current) this.draw(i);
  }
}

/* ---------- section progress helper ---------- */
const progressOf = (el) => {
  const r = el.getBoundingClientRect();
  const total = el.offsetHeight - innerHeight;
  return total <= 0 ? 1 : Math.max(0, Math.min(1, -r.top / total));
};

/* ---------- hero: name split + scrub bindings ---------- */
document.querySelectorAll('[data-line]').forEach(line => {
  line.innerHTML = [...line.textContent].map(c => `<span class="ch">${c}</span>`).join('');
});
const chars = [...document.querySelectorAll('.hero__name .ch')];
const heroName = document.getElementById('hero-name');
const scrubber = new FlipbookScrubber(document.getElementById('orbit-canvas'), CONFIG.frames, heroName);
const hero = document.getElementById('hero');
const sub = document.getElementById('hero-sub');
const hint = document.getElementById('hero-hint');
const progressBar = document.querySelector('#hero-progress i');

/* ---------- pillars: pinned step reveal ---------- */
const pillarsSection = document.getElementById('pillars');
const pillarEls = [...document.querySelectorAll('.pillar')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- master rAF loop (single scroll reader) ---------- */
const tick = () => {
  // hero
  const hp = progressOf(hero);
  scrubber.setProgress(hp);
  const reveal = Math.min(1, hp / CONFIG.heroScrub.nameRevealEnd);
  chars.forEach((ch, i) => {
    const local = Math.max(0, Math.min(1, reveal * (chars.length + 6) - i));
    ch.style.transform = `translateY(${(1 - local) * 110}%)`;
    ch.style.opacity = local;
  });
  sub.style.opacity = hp > CONFIG.heroScrub.subRevealAt ? 1 : 0;
  sub.style.transition = 'opacity .8s';
  hint.style.opacity = hp > CONFIG.heroScrub.hintFadeAt ? 0 : 1;
  hint.style.transition = 'opacity .4s';
  if (progressBar) progressBar.style.height = `${hp * 100}%`;
  // pillars
  if (!reduced) {
    const pp = progressOf(pillarsSection);
    const step = Math.min(CONFIG.pillarsSteps - 1, Math.floor(pp * CONFIG.pillarsSteps));
    pillarEls.forEach((el, i) => el.classList.toggle('is-active', i === step));
  }
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

/* ---------- stats counters ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    const n = en.target, target = +n.dataset.count, t0 = performance.now();
    const run = (t) => {
      const k = Math.min(1, (t - t0) / 1400);
      n.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  });
}, { threshold: 0.6 });
document.querySelectorAll('.stat__n').forEach(el => io.observe(el));

/* ---------- background video loops (swap in when real assets land) ---------- */
document.querySelectorAll('[data-video]').forEach(holder => {
  const v = document.createElement('video');
  Object.assign(v, { src: holder.dataset.video, muted: true, loop: true, autoplay: true, playsInline: true });
  v.addEventListener('canplay', () => { holder.innerHTML = ''; holder.appendChild(v); v.play().catch(()=>{}); }, { once: true });
  v.addEventListener('error', () => { /* keep gradient placeholder */ });
});

/* ---------- custom cursor ---------- */
const cursor = document.querySelector('.cursor');
addEventListener('mousemove', e => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; });
document.querySelectorAll('a,.card,.btn').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
});

/* ---------- anchor scroll via lenis ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = document.querySelector(a.getAttribute('href'));
  if (t) { e.preventDefault(); lenis ? lenis.scrollTo(t) : t.scrollIntoView({ behavior: 'smooth' }); }
}));
