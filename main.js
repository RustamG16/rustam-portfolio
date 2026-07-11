/* =====================================================================
   SITE-ENGINE PROTOTYPE v0.1 — flipbook scrubber + PERSONA scaffold
   Everything below CONFIG is archetype-agnostic engine code.
   ===================================================================== */

/* narrow (phone-like) viewports get a 9:16 center-crop frame set at half
   frame rate (frames/hero-m, 180 frames) — native crop resolution instead
   of upscaling the center strip of the 16:9 desktop frames.
   Threshold is aspect ratio, not orientation: tablet portrait (~3:4) must
   keep the 16:9 set or the 9:16 frames' vertical cover-crop cuts the head. */
const NARROW_ASPECT = 0.65; /* keep in sync with 13/20 preload media queries */
const isNarrowViewport = innerWidth / innerHeight < NARROW_ASPECT;
const FRAME_SETS = {
  desktop: { path: 'frames/hero/frame_',   ext: '.webp', count: 360, pad: 4, poster: 'media/poster.webp' },
  mobile:  { path: 'frames/hero-m/frame_', ext: '.webp', count: 180, pad: 4, poster: 'media/poster-m.webp' }
};

const CONFIG = {
  frames: isNarrowViewport ? FRAME_SETS.mobile : FRAME_SETS.desktop,
  heroScrub: { nameRevealEnd: 0.18, subRevealAt: 0.12, hintFadeAt: 0.05 },
  pillarsSteps: 3
};

/* frame-count-based timings below are authored for the 360-frame set */
const FRAME_SCALE = CONFIG.frames.count / 360;
const scaleFrames = (n) => Math.max(2, Math.round(n * FRAME_SCALE));

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
    this.resize();
    addEventListener('resize', () => this.redraw());
    if (cfg.poster) {
      const poster = new Image();
      poster.decoding = 'async';
      poster.onload = () => {
        this.poster = poster;
        if (this.painted < 0) this.drawPoster();
      };
      poster.src = cfg.poster;
    }
    this.preload();
  }
  src(i) {
    const n = String(i + 1).padStart(this.cfg.pad, '0');
    return `${this.cfg.path}${n}${this.cfg.ext}`;
  }
  load(i) {
    if (i < 0 || i >= this.count || this.images[i]) return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      this.loaded.add(i);
      const active = Math.round(this.displayIdx);
      if (this.painted < 0 && i === 0) this.draw(0);
      else if (i >= active - 2 && i <= active + 2) this.draw(active);
    };
    img.src = this.src(i);
    this.images[i] = img;
  }
  preload() {
    this.load(0);
    for (let i = 0; i < this.count; i += 8) this.load(i);
    let i = 0;
    const fill = () => {
      let done = 0;
      while (i < this.count && done < 6) { this.load(i); i++; done++; }
      if (i < this.count) setTimeout(fill, 50);
    };
    setTimeout(fill, 120);
  }
  prefetchAround(i) {
    const span = 12;
    for (let d = 0; d <= span; d++) {
      this.load(i - d);
      this.load(i + d);
    }
  }
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
  /* size backing store from the canvas's own rendered box (stable 100vh
     sticky) — NOT innerWidth/innerHeight, which change when the mobile
     URL bar collapses/expands and would stretch the drawn image.
     Returns false when nothing changed so scroll-time events are no-ops. */
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(this.canvas.clientWidth * dpr);
    const h = Math.round(this.canvas.clientHeight * dpr);
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
    }
  }
  setProgress(p) {
    this.targetIdx = p * (this.count - 1);
    const i = Math.round(this.targetIdx);
    this.prefetchAround(i);
    if (p > 0.75) this.prefetchToEnd(i);
  }
  step() {
    const delta = this.targetIdx - this.displayIdx;
    if (Math.abs(delta) > 6 || Math.abs(delta) < 0.05) this.displayIdx = this.targetIdx;
    else this.displayIdx += delta * 0.4;
    const i = Math.round(this.displayIdx);
    const needsUpgrade = this.loaded.has(i) && this.painted < i;
    if (i !== this.lastStepIdx || needsUpgrade) {
      this.lastStepIdx = i;
      this.draw(i);
    }
  }
}

/* ---------- section progress helper ----------
   scrub range = section height minus its pinned sticky's height. Both are
   layout values, so progress stays stable while the mobile URL bar
   collapses/expands (live viewport height would shift mid-scroll). */
const progressOf = (el, sticky) => {
  const r = el.getBoundingClientRect();
  const total = el.offsetHeight - sticky.offsetHeight;
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
const heroSticky = hero.querySelector('.hero__sticky');
const sub = document.getElementById('hero-sub');
const hint = document.getElementById('hero-hint');
const progressBar = document.querySelector('#hero-progress i');

/* ---------- pillars: pinned step reveal ---------- */
const pillarsSection = document.getElementById('pillars');
const pillarsSticky = pillarsSection.querySelector('.pillars__sticky');
const pillarEls = [...document.querySelectorAll('.pillar')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- master rAF loop (single scroll reader) ---------- */
const tick = () => {
  const hp = progressOf(hero, heroSticky);
  scrubber.setProgress(hp);
  scrubber.step();
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
  if (!reduced) {
    const pp = progressOf(pillarsSection, pillarsSticky);
    const step = Math.min(CONFIG.pillarsSteps - 1, Math.floor(pp * CONFIG.pillarsSteps));
    pillarEls.forEach((el, i) => el.classList.toggle('is-active', i === step));
  }
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

/* frame set is chosen once at load; if a rotation crosses the narrow/wide
   threshold the loaded set no longer fits the viewport — reload to pick the
   right one. Debounced; URL-bar resizes never cross the threshold. */
let aspectTimer = 0;
addEventListener('resize', () => {
  clearTimeout(aspectTimer);
  aspectTimer = setTimeout(() => {
    if ((innerWidth / innerHeight < NARROW_ASPECT) !== isNarrowViewport) location.reload();
  }, 400);
});

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
    if (videoVisible.get(v)) playBgVideo(v);
  };
  v.addEventListener('canplay', mount, { once: true });
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
    videoVisible.set(v, en.isIntersecting);
    if (en.isIntersecting) playBgVideo(v);
    else if (v && !v.paused) v.pause();
  });
}, { threshold: 0.05 });
bgVideos.forEach((_, holder) => videoIo.observe(holder));

/* ---------- custom cursor ---------- */
const cursor = document.querySelector('.cursor');
addEventListener('mousemove', e => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; });
document.querySelectorAll('a,.card,.btn').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
});

/* ---------- anchor scroll via lenis ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const href = a.getAttribute('href');
  if (href.length < 2) { e.preventDefault(); return; } /* bare "#" placeholder links */
  const t = document.querySelector(href);
  if (t) { e.preventDefault(); lenis ? lenis.scrollTo(t) : t.scrollIntoView({ behavior: 'smooth' }); }
}));
