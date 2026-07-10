/* =====================================================================
   SITE-ENGINE PROTOTYPE v0.1 — flipbook scrubber + PERSONA scaffold
   Everything below CONFIG is archetype-agnostic engine code.
   ===================================================================== */

const CONFIG = {
  frames: {
    path: 'frames/hero/frame_',   // + %04d + .webp
    ext: '.webp',
    count: 200,                   // orbit-b(1) 10s @ 20fps
    pad: 4,
    mobilePath: 'frames/hero-mobile/frame_',
    mobileCount: 100,             // orbit-b(1) 10s @ 10fps
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

/* ---------- FlipbookScrubber ----------
   Canvas frame-sequence scrubber with:
   - coarse-first preloading (every 8th frame, then fill)
   - hold-last-frame until target frame loads (no nearest-frame jumping)
   - cover-fit draw, devicePixelRatio aware                     */
class FlipbookScrubber {
  constructor(canvas, cfg) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cfg = cfg;
    this.isMobile = innerWidth < 768 && !!cfg.mobilePath;
    this.count = this.isMobile ? (cfg.mobileCount || cfg.count) : cfg.count;
    this.images = new Array(this.count).fill(null);
    this.loaded = new Set();
    this.target = 0;
    this.drawn = -1;
    this.poster = null;
    this.resize();
    addEventListener('resize', () => { this.resize(); this.paint(this.drawn < 0 ? 0 : this.drawn); });
    if (cfg.poster) {
      const poster = new Image();
      poster.decoding = 'async';
      poster.onload = () => {
        this.poster = poster;
        if (this.drawn < 0) this.drawPoster();
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
    if (i < 0 || i >= this.count || this.images[i]) return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      this.loaded.add(i);
      if (this.drawn < 0 && i === 0) this.paint(0);
      else if (i === this.target) this.paint(i);
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
    const span = this.isMobile ? 10 : 8;
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
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
  }
  paint(i) {
    if (!this.loaded.has(i)) {
      if (this.poster && this.drawn < 0) this.drawPoster();
      return;
    }
    this.drawn = i;
    const img = this.images[i];
    const cw = this.canvas.width, ch = this.canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }
  setProgress(p) {
    const i = Math.max(0, Math.min(this.count - 1, Math.round(p * (this.count - 1))));
    this.target = i;
    this.prefetchAround(i);
    if (i !== this.drawn) this.paint(i);
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
const scrubber = new FlipbookScrubber(document.getElementById('orbit-canvas'), CONFIG.frames);
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
