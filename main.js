/* =====================================================================
   SITE-ENGINE PROTOTYPE v0.1 — flipbook scrubber + PERSONA scaffold
   Everything below CONFIG is archetype-agnostic engine code.
   ===================================================================== */

const CONFIG = {
  frames: {
    path: 'frames/hero/frame_',   // + %04d + .webp
    ext: '.webp',
    count: 360,                   // orbit-a 8s + orbit-b(1) 10s @ 20fps
    pad: 4,
    mobilePath: 'frames/hero-mobile/frame_',
    mobileCount: 160,             // 10fps variant
    mobileHighQuality: true,      // load 1600px desktop frames on mobile (every 2nd)
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

/* ---------- FlipbookScrubber ---------- */
class FlipbookScrubber {
  constructor(canvas, cfg, glitchEl = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.cfg = cfg;
    this.glitchEl = glitchEl;
    this.isMobile = innerWidth < 768 && !!cfg.mobilePath;
    this.hqMobile = this.isMobile && !!cfg.mobileHighQuality;
    this.count = this.isMobile ? (cfg.mobileCount || cfg.count) : cfg.count;
    this.images = new Array(this.count).fill(null);
    this.loaded = new Set();
    this.targetIdx = 0;
    this.displayIdx = 0;
    this.lastStepIdx = -1;
    this.painted = -1;
    this.poster = null;
    this.resize();
    addEventListener('resize', () => { this.resize(); this.draw(Math.round(this.displayIdx)); });
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
  frameNum(i) {
    if (this.hqMobile) return i * 2 + 1;
    return i + 1;
  }
  src(i) {
    const n = String(this.frameNum(i)).padStart(this.cfg.pad, '0');
    const base = this.hqMobile ? this.cfg.path : (this.isMobile ? this.cfg.mobilePath : this.cfg.path);
    return `${base}${n}${this.cfg.ext}`;
  }
  load(i) {
    if (i < 0 || i >= this.count || this.images[i]) return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      this.loaded.add(i);
      const active = Math.round(this.displayIdx);
      if (this.painted < 0 && i === 0) this.draw(0);
      else if (i === active) this.draw(i);
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
    const span = this.isMobile ? 12 : 10;
    for (let d = 0; d <= span; d++) {
      this.load(i - d);
      this.load(i + d);
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
    const maxGap = this.isMobile ? 3 : 2;
    for (let d = 1; d <= maxGap; d++) {
      if (this.loaded.has(i - d)) return i - d;
      if (this.loaded.has(i + d)) return i + d;
    }
    return this.painted >= 0 ? this.painted : -1;
  }
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, this.isMobile ? 3 : 2);
    this.canvas.width = Math.round(innerWidth * dpr);
    this.canvas.height = Math.round(innerHeight * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
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
    this.targetIdx = p * (this.count - 1);
    this.prefetchAround(Math.round(this.targetIdx));
  }
  step() {
    const delta = this.targetIdx - this.displayIdx;
    if (Math.abs(delta) < 0.04) this.displayIdx = this.targetIdx;
    else this.displayIdx += delta * (this.isMobile ? 0.28 : 0.22);
    const i = Math.round(this.displayIdx);
    if (i !== this.lastStepIdx) {
      this.lastStepIdx = i;
      this.draw(i);
    }
  }
}

/* ---------- section progress helper ---------- */
const viewportHeight = () => window.visualViewport?.height ?? innerHeight;

const progressOf = (el) => {
  const r = el.getBoundingClientRect();
  const total = el.offsetHeight - viewportHeight();
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
  const hp = progressOf(hero);
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
    const pp = progressOf(pillarsSection);
    const step = Math.min(CONFIG.pillarsSteps - 1, Math.floor(pp * CONFIG.pillarsSteps));
    pillarEls.forEach((el, i) => el.classList.toggle('is-active', i === step));
  }
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

if (window.visualViewport) {
  visualViewport.addEventListener('resize', () => scrubber.resize());
  visualViewport.addEventListener('scroll', () => scrubber.resize());
}

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
const bgVideos = [];
const playBgVideo = (v) => {
  if (v.readyState < 2) return;
  const p = v.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
};
document.querySelectorAll('[data-video]').forEach(holder => {
  const v = document.createElement('video');
  v.src = holder.dataset.video;
  v.muted = true;
  v.loop = true;
  v.autoplay = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  const mount = () => {
    if (!holder.contains(v)) {
      holder.innerHTML = '';
      holder.appendChild(v);
    }
    playBgVideo(v);
  };
  v.addEventListener('canplay', mount, { once: true });
  v.addEventListener('loadeddata', mount);
  v.addEventListener('ended', () => { v.currentTime = 0; playBgVideo(v); });
  v.addEventListener('stalled', () => playBgVideo(v));
  bgVideos.push(v);
  v.load();
});
const resumeBgVideos = () => bgVideos.forEach(playBgVideo);
document.addEventListener('visibilitychange', () => { if (!document.hidden) resumeBgVideos(); });
window.addEventListener('pageshow', resumeBgVideos);
window.addEventListener('focus', resumeBgVideos);
const videoIo = new IntersectionObserver((entries) => {
  entries.forEach(en => { if (en.isIntersecting) playBgVideo(en.target); });
}, { threshold: 0.05 });
bgVideos.forEach(v => videoIo.observe(v));

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
