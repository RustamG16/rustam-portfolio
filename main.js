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
  desktop: { path: 'frames/hero/frame_',    ext: '.webp', count: 360, pad: 4, poster: 'media/poster.webp' },
  mobileAvif: { path: 'frames/hero-m2/frame_', ext: '.avif', count: 90,  pad: 4, poster: 'media/poster-m.webp' },
  mobileWebp: { path: 'frames/hero-m/frame_',  ext: '.webp', count: 180, pad: 4, poster: 'media/poster-m.webp' }
};

/* Prefer AVIF on narrow; FlipbookScrubber falls back to WebP if frame 0 fails to decode. */
/* The cover is a four-beat sequence, all driven from ONE rAF loop reading
   plain position:sticky geometry (no ScrollTrigger pin, so nothing downstream
   can perturb it):

     0.00–0.16  cold open — kicker, per-character name, metadata rows write in
     0.16–0.55  the examination — orbit plays, film gauge counts the strip
     0.55–0.93  the seam — existing glitch fires, name flips acid; the
                flipbook's 360 frames finish exactly at 0.93 (frame progress
                is remapped into 0..sheetStart, see `fp` in tick())
     0.93–1.00  the sheet rises — paper panel snaps up over the cover      */
const CONFIG = {
  frames: isNarrowViewport ? FRAME_SETS.mobileAvif : FRAME_SETS.desktop,
  heroScrub: {
    kickerRevealAt: 0.012,
    nameRevealEnd: 0.16,
    subRevealAt: 0.11,
    metaStart: 0.13, metaEnd: 0.30,   /* rows stagger by SCROLL, not by time */
    actionsRevealAt: 0.30,
    hintFadeAt: 0.05,
    sheetStart: 0.93                  /* the file opens — frame 360 lands exactly here */
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
    if (i < 0 || i >= this.count || this.images[i]) return Promise.resolve();
    const img = new Image();
    img.decoding = 'async';
    this.images[i] = img;
    const done = () => {
      this.loaded.add(i);
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
    const fb = FRAME_SETS.mobileWebp;
    this.cfg = fb;
    this.count = fb.count;
    this.images = new Array(this.count).fill(null);
    this.loaded = new Set();
    this.painted = -1;
    return this.preload();
  }
  preload() {
    const kick = async () => {
      await this.load(0);
      const ahead = Math.min(this.count, 10);
      for (let i = 1; i < ahead; i++) await this.load(i);
      let i = ahead;
      const fill = () => {
        let n = 0;
        while (i < this.count && n < 6) { this.load(i); i++; n++; }
        if (i < this.count) setTimeout(fill, 50);
      };
      setTimeout(fill, 80);
    };
    return kick();
  }
  prefetchAround(i) {
    const behind = 4;
    const ahead = 10;
    for (let d = 0; d <= behind; d++) this.load(i - d);
    for (let d = 1; d <= ahead; d++) this.load(i + d);
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
      this.glitchEl.classList.toggle('is-post-seam', i >= seam);
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
    'meta.contentsVal': '4 SHEETS · 3 PROJECTS · 6 DISCIPLINES',
    'run.brief': 'BRIEF RG-2026',
    'run.sheet01': 'SHEET 01',
    'sheetcue.next': 'Next sheet',
    'sheetcue.go': 'CONTINUE',
    'sum.title': 'Summary',
    'sum.lede': 'Ten years turning ideas into software that ships. I work the whole pipeline — architecture, interface, motion, and the AI systems that automate the rest — so a project never waits on a handoff.',
    'sum.statusKey': 'STATUS',
    'sum.statusVal': 'BASED IN KLAGENFURT, AUSTRIA · EU / REMOTE',
    'stats.years': 'Years building',
    'stats.projects': 'Projects shipped',
    'stats.languages': 'Languages spoken',
    'stats.pipeline': 'Person, whole pipeline',
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
    'work.sonnwerk': 'Premium CBD brand site — field-to-bottle storytelling, editorial type, scroll narrative.',
    'work.urologie': 'Medical boutique practice site for Dr. Danijel Jozipovic — calm precision, booking-led.',
    'work.eduHub': 'Study-abroad consultancy landing — guidance-focused scroll experience for international students.',
    'work.tag.brand': 'Brand · Scrollytelling',
    'work.tag.health': 'Healthcare · Landing',
    'work.tag.edu': 'Education · Landing',
    'work.cta': 'View project →',
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
    'meta.contentsVal': '4 BLÄTTER · 3 PROJEKTE · 6 DISZIPLINEN',
    'run.brief': 'DOSSIER RG-2026',
    'run.sheet01': 'BLATT 01',
    'sheetcue.next': 'Nächstes Blatt',
    'sheetcue.go': 'WEITER',
    'sum.title': 'Überblick',
    'sum.lede': 'Zehn Jahre, in denen aus Ideen Software wurde, die live geht. Ich übernehme die ganze Pipeline — Architektur, Interface, Motion und die KI-Systeme, die den Rest automatisieren — so wartet ein Projekt nie auf eine Übergabe.',
    'sum.statusKey': 'STATUS',
    'sum.statusVal': 'BASIS KLAGENFURT, ÖSTERREICH · EU / REMOTE',
    'stats.years': 'Jahre Erfahrung',
    'stats.projects': 'Projekte geliefert',
    'stats.languages': 'Gesprochene Sprachen',
    'stats.pipeline': 'Person, ganze Pipeline',
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
    'work.sonnwerk': 'Premium-CBD-Markenseite — Storytelling vom Feld zur Flasche, editorial Typo, Scroll-Narrativ.',
    'work.urologie': 'Medizinische Boutique-Praxis-Website für Dr. Danijel Jozipovic — ruhige Präzision, buchungsgeführt.',
    'work.eduHub': 'Landingpage für Studienberatung — guidance-fokussiertes Scroll-Erlebnis für internationale Studierende.',
    'work.tag.brand': 'Brand · Scrollytelling',
    'work.tag.health': 'Healthcare · Landing',
    'work.tag.edu': 'Education · Landing',
    'work.cta': 'Projekt ansehen →',
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
const orbitCanvas = document.getElementById('orbit-canvas');
const hero = document.getElementById('hero');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (orbitCanvas && hero) {
  document.querySelectorAll('[data-line]').forEach(line => {
    line.innerHTML = [...line.textContent].map(c => `<span class="ch">${c}</span>`).join('');
  });
  const chars = [...document.querySelectorAll('.hero__name .ch')];
  const heroName = document.getElementById('hero-name');
  const scrubber = new FlipbookScrubber(orbitCanvas, CONFIG.frames, heroName);
  const heroSticky = hero.querySelector('.hero__sticky');
  const kicker = document.querySelector('.hero__kicker');
  const sub = document.getElementById('hero-sub');
  const metaRows = [...document.querySelectorAll('.hero__meta-row')];
  const actions = document.getElementById('hero-actions');
  const hint = document.getElementById('hero-hint');
  const sheet = document.getElementById('hero-sheet');
  const gaugeCur = document.getElementById('gauge-cur');
  const gaugeTotal = document.getElementById('gauge-total');
  const gaugeFill = document.getElementById('gauge-fill');
  const S = CONFIG.heroScrub;

  /* map a value from one range to 0..1, clamped */
  const range = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));

  if (gaugeTotal) gaugeTotal.textContent = String(scrubber.count);

  if (reduced) {
    /* the cover collapses to a single static screen — show everything */
    [kicker, sub, actions].forEach((el) => { if (el) el.style.opacity = 1; });
    metaRows.forEach((r) => { r.style.opacity = 1; });
    if (actions) actions.style.pointerEvents = 'auto';
    const pillarsStripEarly = document.querySelector('.pillars__strip');
    if (pillarsStripEarly) pillarsStripEarly.classList.add('is-visible');
    if (heroName) heroName.classList.add('is-post-seam');
  }

  /* ---------- master rAF loop (cover only — later sheets use ScrollTrigger) ---------- */
  let lastFrameLabel = '';
  const tick = () => {
    const hp = progressOf(hero, heroSticky);
    /* the flipbook must finish its own 360 frames BEFORE the paper sheet
       starts rising over it — remap scrub progress into 0..sheetStart so
       frame 360 lands exactly where the panel begins, instead of the last
       ~15% of frames playing invisibly underneath it. */
    const fp = range(hp, 0, S.sheetStart);
    scrubber.setProgress(fp);
    scrubber.step();

    /* beat 1 — per-character name reveal */
    const revealP = Math.min(1, hp / S.nameRevealEnd);
    chars.forEach((ch, i) => {
      const local = Math.max(0, Math.min(1, revealP * (chars.length + 6) - i));
      ch.style.transform = `translateY(${(1 - local) * 110}%)`;
      ch.style.opacity = local;
    });

    if (!reduced) {
      if (kicker) {
        kicker.style.opacity = hp > S.kickerRevealAt ? 1 : 0;
        kicker.style.transition = 'opacity .6s';
      }
      if (sub) {
        sub.style.opacity = hp > S.subRevealAt ? 1 : 0;
        sub.style.transition = 'opacity .8s';
      }
      /* beat 1b — metadata rows write in one at a time, staggered by SCROLL
         position rather than by a timer, so scrubbing back un-writes them */
      if (metaRows.length) {
        const mp = range(hp, S.metaStart, S.metaEnd);
        metaRows.forEach((row, i) => {
          const local = Math.max(0, Math.min(1, mp * (metaRows.length + 1) - i));
          row.style.opacity = local;
        });
      }
      if (actions) {
        const showActions = hp > S.actionsRevealAt;
        actions.style.opacity = showActions ? 1 : 0;
        actions.style.transition = 'opacity .8s';
        actions.style.pointerEvents = showActions ? 'auto' : 'none';
      }
    }

    if (hint) {
      hint.style.opacity = hp > S.hintFadeAt ? 0 : 1;
      hint.style.transition = 'opacity .4s';
    }

    /* beat 2 — the film gauge. Reads the flipbook as a strip being examined.
       Text writes are gated on an actual change so we don't touch the DOM
       every frame for an identical string. */
    if (gaugeCur) {
      const n = Math.min(scrubber.count, Math.round(fp * (scrubber.count - 1)) + 1);
      const label = String(n).padStart(3, '0');
      if (label !== lastFrameLabel) { lastFrameLabel = label; gaugeCur.textContent = label; }
    }
    if (gaugeFill) gaugeFill.style.height = `${fp * 100}%`;

    /* beat 4 — the sheet rises and becomes the paper half of the document.
       Eased (smoothstep) so the rise reads as a snap over the last stretch
       of the scrub rather than a slow crawl. Transform only, stays on the
       compositor. */
    if (sheet && !reduced) {
      const k = smoothstep(range(hp, S.sheetStart, 1));
      sheet.style.transform = `translateY(${(1 - k) * 100}%)`;
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
}

/* ---------- capability sheet: ScrollTrigger pin (one entry per step) ---------- */
(() => {
  const section = document.getElementById('pillars');
  if (!section || !gsapReady) return;
  const sticky = section.querySelector('.pillars__sticky');
  const pillars = gsap.utils.toArray('.pillar', section);
  const strip = section.querySelector('.pillars__strip');
  if (!sticky || !pillars.length) return;

  const setPillarStep = (step) => {
    pillars.forEach((el, i) => {
      const on = i === step;
      el.classList.toggle('is-active', on);
      gsap.set(el, { autoAlpha: on ? 1 : 0 });
    });
  };

  const mm = gsap.matchMedia();
  mm.add(
    {
      isMotion: '(prefers-reduced-motion: no-preference)',
      reduceMotion: '(prefers-reduced-motion: reduce)'
    },
    (context) => {
      const { reduceMotion } = context.conditions;
      if (reduceMotion) {
        pillars.forEach((el) => {
          el.classList.add('is-active');
          gsap.set(el, { clearProps: 'opacity,visibility' });
        });
        if (strip) strip.classList.add('is-visible');
        return;
      }

      setPillarStep(0);
      let lastStep = 0;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sticky,
          start: 'top top',
          end: '+=' + pillars.length * 50 + '%',
          pin: true,
          scrub: true,
          id: 'pillars',
          onUpdate: (self) => {
            if (strip) strip.classList.toggle('is-visible', self.progress >= CONFIG.stripRevealAt);
            const step = Math.min(
              pillars.length - 1,
              Math.max(0, Math.round(self.progress * (pillars.length - 1)))
            );
            if (step !== lastStep) {
              lastStep = step;
              setPillarStep(step);
            }
          }
        }
      });

      pillars.forEach((_, i) => {
        if (i === 0) return;
        tl.to({}, { duration: 0.5 });
      });
      tl.to({}, { duration: 0.15 });

      return () => { /* matchMedia reverts ST */ };
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

/* ---------- 03 · selected work: sticky video window ----------
   Idle, the panel loops media/closer.mp4 via the shared [data-video]
   machinery below (untouched — that's what gives this loop the same lazy
   mount, visibility pause/resume and low-power retry every other bg video
   on the page gets). Hovering/focusing a row crossfades in that project's
   poster immediately, then its preview clip once (if) it can load — a
   missing clip just leaves the poster on screen, nothing errors visibly. */
(() => {
  const section = document.getElementById('work');
  const frame = document.getElementById('worx-frame');
  const rows = [...document.querySelectorAll('.worx__row')];
  if (!section || !frame || !rows.length) return;

  const hoverPoster = document.getElementById('worx-hover-poster');
  const capLabel = document.getElementById('worx-cap-label');
  const capSrc = document.getElementById('worx-cap-src');
  /* looked up live (not cached at load) because #worx-cap-label carries
     data-i18n="cap.plate" — a language toggle rewrites it directly via
     applyLang(), and a stale cached string here would stomp that back to
     the old language on the next hover/unhover. idleSrc has no i18n key
     (matches the Capability plate's own hardcoded "BUILDER.MP4"), so it's
     safe to read once. */
  const getIdleLabel = () => (I18N[currentLang] && I18N[currentLang]['cap.plate']) || (capLabel ? capLabel.textContent : '');
  const idleSrc = capSrc ? capSrc.textContent : '';

  const canHover = () =>
    matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;

  const videoCache = new Map(); // slug -> { el, failed }
  let activeVideo = null;
  let leaveTimer = 0;

  function getPreviewVideo(row) {
    const slug = row.id;
    let entry = videoCache.get(slug);
    if (entry) return entry;
    const src = row.dataset.preview;
    const el = document.createElement('video');
    el.className = 'plate__frame-layer worx__hover-video';
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = 'auto'; /* created lazily on first hover of THIS row — the row is already being hovered, so start fetching immediately */
    el.setAttribute('muted', '');
    el.setAttribute('playsinline', '');
    entry = { el, failed: false };
    videoCache.set(slug, entry);
    el.addEventListener('error', () => { entry.failed = true; }, { once: true });
    el.src = src;
    frame.appendChild(el);
    return entry;
  }

  function setIdle() {
    if (hoverPoster) hoverPoster.classList.remove('is-active');
    if (activeVideo) { activeVideo.el.classList.remove('is-active'); activeVideo.el.pause(); activeVideo = null; }
    if (capLabel) capLabel.textContent = getIdleLabel();
    if (capSrc) capSrc.textContent = idleSrc;
  }

  function activate(row) {
    clearTimeout(leaveTimer);
    if (capLabel) capLabel.textContent = row.dataset.capLabel || getIdleLabel();
    if (capSrc) capSrc.textContent = row.dataset.capSrc || idleSrc;

    if (activeVideo) { activeVideo.el.classList.remove('is-active'); activeVideo.el.pause(); activeVideo = null; }

    if (hoverPoster) {
      hoverPoster.src = row.dataset.poster;
      hoverPoster.classList.add('is-active');
    }

    if (!row.dataset.preview) return;
    const entry = getPreviewVideo(row);
    activeVideo = entry;
    if (entry.failed) return; // stays on the poster — graceful fallback
    try { entry.el.currentTime = 0; } catch (e) { /* not seekable yet — fine, it starts at 0 anyway */ }
    const show = () => { entry.el.classList.add('is-active'); };
    if (entry.el.readyState >= 2) show();
    else entry.el.addEventListener('loadeddata', show, { once: true });
    const p = entry.el.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  function scheduleLeave() {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(setIdle, 140);
  }

  rows.forEach((row) => {
    row.addEventListener('mouseenter', () => { if (canHover()) activate(row); });
    row.addEventListener('mouseleave', () => { if (canHover()) scheduleLeave(); });
    row.addEventListener('focusin', () => { if (canHover()) activate(row); });
    row.addEventListener('focusout', () => { if (canHover()) scheduleLeave(); });
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
     band: from the moment the cover's sheet starts rising, to the moment the
     dark close arrives. Both edges belong to the same trigger, so isActive is
     resolved from the final scroll position rather than from which edges got
     crossed. That matters: an earlier version used a start-edge onEnter plus
     a separate per-section writer, and jumping straight from the cover to
     #contact (which every sheet-counter link can do) fired the start edge,
     blew past the end edge, and left a paper counter on a dark screen. */
  const hero = document.getElementById('hero');
  const contact = document.getElementById('contact');
  if (hero && contact) {
    ScrollTrigger.create({
      trigger: hero,
      start: () => 'top top-=' + (hero.offsetHeight * CONFIG.heroScrub.sheetStart),
      endTrigger: contact,
      end: 'top center',
      onToggle: (self) => { root.classList.toggle('chrome-paper', self.isActive); }
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
  /* [data-close-line], not 'span' — the middle line now wraps its own
     accent word + hairline + tag in nested spans, which a bare 'span'
     selector would also sweep into this 3-line stagger. Deliberately NOT
     named data-line: that attribute is already used globally by the hero's
     char-split effect (main.js, `document.querySelectorAll('[data-line]')`
     with no scoping), which would otherwise also catch these and mangle
     them. */
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

/* CV page reveals now live in cv.js */
