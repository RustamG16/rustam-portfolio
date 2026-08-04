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
const CONFIG = {
  frames: isNarrowViewport ? FRAME_SETS.mobileAvif : FRAME_SETS.desktop,
  heroScrub: { nameRevealEnd: 0.18, subRevealAt: 0.12, actionsRevealAt: 0.18, hintFadeAt: 0.05 },
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
    'nav.langAria': 'Switch language',
    'hero.sub': 'Software Engineer · AI Orchestrator · Designer · Creator',
    'hero.cv': 'Download CV',
    'hero.experience': 'Experience & documents →',
    'hero.scroll': 'SCROLL',
    'stats.years': 'Years building',
    'stats.projects': 'Projects shipped',
    'stats.languages': 'Languages spoken',
    'stats.pipeline': 'Person, whole pipeline',
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
    'whatsapp.aria': 'Chat on WhatsApp',
    'cv.skip': 'Skip to experience',
    'cv.back': '← Back to portfolio',
    'cv.role': 'Software Engineer · Full-stack · Data · Design · Content',
    'cv.download': 'Download CV',
    'cv.selectedWork': 'Selected work →',
    'cv.exp': 'Experience',
    'cv.edu': 'Education',
    'cv.skills': 'Skills',
    'cv.langs': 'Languages',
    'cv.docs': 'Documents',
    'cv.dl': 'Download',
    'cv.job.infineon.role': 'Digitalization Engineer, Fullstack Developer',
    'cv.job.infineon.meta': 'Infineon Technologies · Villach, Austria · 10/2023 – 04/2026',
    'cv.job.infineon.b1': 'Shipped fullstack tools for manufacturing digitalization — data workflows, APIs, and operator-facing UIs.',
    'cv.job.infineon.b2': 'Built and automated KNIME / OpenShift pipelines; IFX-KNIME Division Pioneer Award (E9Steps, 2024).',
    'cv.job.infineon.b3': 'Owned features end to end: TypeScript/React frontends, testing, Git workflows, and production handoff.',
    'cv.job.iba.role': 'Frontend Developer, Graphical Designer',
    'cv.job.iba.meta': 'International Bank of Azerbaijan · Baku, Azerbaijan · 12/2019 – 07/2021',
    'cv.job.iba.b1': 'Designed and built frontend interfaces for bank digital products with HTML, CSS, JS, and React.',
    'cv.job.iba.b2': 'Produced brand-aligned graphic assets and UI systems that kept product and marketing in sync.',
    'cv.job.ibatech.role': 'Frontend Developer',
    'cv.job.ibatech.meta': 'IBA-Tech Academy (International Bank of Azerbaijan) · Baku, Azerbaijan · 10/2019 – 12/2019',
    'cv.job.ibatech.b1': 'Completed intensive frontend development track (DAN.IT / IBA Tech Academy) and shipped academy projects.',
    'cv.job.bank.role': 'Help desk specialist',
    'cv.job.bank.meta': 'Bank Republic · Baku, Azerbaijan · 08/2018 – 10/2019',
    'cv.job.bank.b1': 'First-line support for customers and internal teams — triage, resolution, and clear handoffs.',
    'cv.edu.master.role': 'Master of Game Studies and Engineering',
    'cv.edu.master.meta': 'Klagenfurt Alpen-Adria University · Klagenfurt, Austria · 10/2021 – Present',
    'cv.edu.bach.role': 'Bachelor of Information Technologies (IT)',
    'cv.edu.bach.meta': 'Azerbaijan Technical University · Baku, Azerbaijan · 09/2017 – 07/2021',
    'cv.skills.eng': 'Engineering',
    'cv.skills.design': 'Design',
    'cv.skills.design.graphic': 'Graphic design',
    'cv.skills.design.scroll': 'Scroll animation',
    'cv.skills.ai': 'AI & Automation',
    'cv.skills.ai.orch': 'AI orchestration',
    'cv.skills.ai.content': 'Content generation',
    'cv.skills.mkt': 'Marketing',
    'cv.skills.mkt.1': 'Content strategy',
    'cv.skills.mkt.2': 'Social media',
    'cv.skills.mkt.3': 'Brand storytelling',
    'cv.lang.az': 'Azerbaijani',
    'cv.lang.az.lvl': 'native',
    'cv.lang.en': 'English',
    'cv.lang.de': 'German',
    'cv.lang.ru': 'Russian',
    'cv.lang.tr': 'Turkish',
    'cv.lang.es': 'Spanish',
    'cv.doc.bach.title': 'Bachelor Certificate',
    'cv.doc.bach.desc': 'Degree certificate — Azerbaijan Technical University (Information Technologies).',
    'cv.doc.iba.title': 'IBA Tech Academy — Frontend Certificate',
    'cv.doc.iba.desc': 'Completion certificate — Frontend Development (Oct–Dec 2019), IBA Tech Academy / DAN.IT.',
    'cv.doc.knime.title': 'IFX-KNIME Division Pioneer Award',
    'cv.doc.knime.desc': 'Infineon certificate of achievement — IDEA: E9Steps, Use Case Contest 2024.',
    'cv.doc.ref1.title': 'Reference Letter',
    'cv.doc.ref1.desc': 'Professional reference letter (scanned PDF).',
    'cv.doc.ref2.title': 'Reference Letter 2',
    'cv.doc.ref2.desc': 'Additional professional reference letter (scanned PDF).'
  },
  de: {
    'nav.cta': 'Projekt starten',
    'nav.cv': 'Lebenslauf laden',
    'nav.experience': 'Erfahrung',
    'nav.langAria': 'Sprache wechseln',
    'hero.sub': 'Softwareentwickler · KI-Orchestrator · Designer · Creator',
    'hero.cv': 'Lebenslauf laden',
    'hero.experience': 'Erfahrung & Dokumente →',
    'hero.scroll': 'SCROLLEN',
    'stats.years': 'Jahre Erfahrung',
    'stats.projects': 'Projekte geliefert',
    'stats.languages': 'Gesprochene Sprachen',
    'stats.pipeline': 'Person, ganze Pipeline',
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
    'whatsapp.aria': 'Per WhatsApp chatten',
    'cv.skip': 'Zur Erfahrung springen',
    'cv.back': '← Zurück zum Portfolio',
    'cv.role': 'Softwareentwickler · Full-stack · Data · Design · Content',
    'cv.download': 'Lebenslauf laden',
    'cv.selectedWork': 'Ausgewählte Arbeiten →',
    'cv.exp': 'Erfahrung',
    'cv.edu': 'Ausbildung',
    'cv.skills': 'Fähigkeiten',
    'cv.langs': 'Sprachen',
    'cv.docs': 'Dokumente',
    'cv.dl': 'Download',
    'cv.job.infineon.role': 'Digitalization Engineer, Fullstack Developer',
    'cv.job.infineon.meta': 'Infineon Technologies · Villach, Österreich · 10/2023 – 04/2026',
    'cv.job.infineon.b1': 'Fullstack-Tools für Fertigungsdigitalisierung — Datenworkflows, APIs und bedienernahe UIs.',
    'cv.job.infineon.b2': 'KNIME-/OpenShift-Pipelines gebaut und automatisiert; IFX-KNIME Division Pioneer Award (E9Steps, 2024).',
    'cv.job.infineon.b3': 'Features end-to-end: TypeScript/React-Frontends, Testing, Git-Workflows und Production-Handoff.',
    'cv.job.iba.role': 'Frontend Developer, Graphical Designer',
    'cv.job.iba.meta': 'International Bank of Azerbaijan · Baku, Aserbaidschan · 12/2019 – 07/2021',
    'cv.job.iba.b1': 'Frontend-Interfaces für digitale Bankprodukte mit HTML, CSS, JS und React.',
    'cv.job.iba.b2': 'Markenkonforme Grafiken und UI-Systeme — Produkt und Marketing im Gleichklang.',
    'cv.job.ibatech.role': 'Frontend Developer',
    'cv.job.ibatech.meta': 'IBA-Tech Academy (International Bank of Azerbaijan) · Baku, Aserbaidschan · 10/2019 – 12/2019',
    'cv.job.ibatech.b1': 'Intensivkurs Frontend Development (DAN.IT / IBA Tech Academy) und ausgelieferte Academy-Projekte.',
    'cv.job.bank.role': 'Help desk specialist',
    'cv.job.bank.meta': 'Bank Republic · Baku, Aserbaidschan · 08/2018 – 10/2019',
    'cv.job.bank.b1': 'First-Level-Support für Kunden und interne Teams — Triage, Lösung, klare Übergaben.',
    'cv.edu.master.role': 'Master of Game Studies and Engineering',
    'cv.edu.master.meta': 'Alpen-Adria-Universität Klagenfurt · Klagenfurt, Österreich · 10/2021 – Present',
    'cv.edu.bach.role': 'Bachelor of Information Technologies (IT)',
    'cv.edu.bach.meta': 'Azerbaijan Technical University · Baku, Aserbaidschan · 09/2017 – 07/2021',
    'cv.skills.eng': 'Engineering',
    'cv.skills.design': 'Design',
    'cv.skills.design.graphic': 'Grafikdesign',
    'cv.skills.design.scroll': 'Scroll-Animation',
    'cv.skills.ai': 'KI & Automation',
    'cv.skills.ai.orch': 'KI-Orchestrierung',
    'cv.skills.ai.content': 'Content-Generierung',
    'cv.skills.mkt': 'Marketing',
    'cv.skills.mkt.1': 'Content-Strategie',
    'cv.skills.mkt.2': 'Social Media',
    'cv.skills.mkt.3': 'Brand Storytelling',
    'cv.lang.az': 'Aserbaidschanisch',
    'cv.lang.az.lvl': 'Muttersprache',
    'cv.lang.en': 'Englisch',
    'cv.lang.de': 'Deutsch',
    'cv.lang.ru': 'Russisch',
    'cv.lang.tr': 'Türkisch',
    'cv.lang.es': 'Spanisch',
    'cv.doc.bach.title': 'Bachelor-Zeugnis',
    'cv.doc.bach.desc': 'Abschlusszeugnis — Azerbaijan Technical University (Information Technologies).',
    'cv.doc.iba.title': 'IBA Tech Academy — Frontend-Zertifikat',
    'cv.doc.iba.desc': 'Abschlusszertifikat — Frontend Development (Okt–Dez 2019), IBA Tech Academy / DAN.IT.',
    'cv.doc.knime.title': 'IFX-KNIME Division Pioneer Award',
    'cv.doc.knime.desc': 'Infineon-Auszeichnung — IDEA: E9Steps, Use Case Contest 2024.',
    'cv.doc.ref1.title': 'Empfehlungsschreiben',
    'cv.doc.ref1.desc': 'Professionelles Empfehlungsschreiben (gescanntes PDF).',
    'cv.doc.ref2.title': 'Empfehlungsschreiben 2',
    'cv.doc.ref2.desc': 'Weiteres professionelles Empfehlungsschreiben (gescanntes PDF).'
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
  const sub = document.getElementById('hero-sub');
  const actions = document.getElementById('hero-actions');
  const hint = document.getElementById('hero-hint');
  const progressBar = document.querySelector('#hero-progress i');

  if (reduced) {
    if (sub) sub.style.opacity = 1;
    if (actions) {
      actions.style.opacity = 1;
      actions.style.pointerEvents = 'auto';
    }
    const pillarsStripEarly = document.querySelector('.pillars__strip');
    if (pillarsStripEarly) pillarsStripEarly.classList.add('is-visible');
    if (heroName) heroName.classList.add('is-post-seam');
  }

  /* ---------- master rAF loop (hero scrub only — pillars/work via ScrollTrigger) ---------- */
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
    if (!reduced) {
      if (sub) {
        sub.style.opacity = hp > CONFIG.heroScrub.subRevealAt ? 1 : 0;
        sub.style.transition = 'opacity .8s';
      }
      if (actions) {
        const showActions = hp > CONFIG.heroScrub.actionsRevealAt;
        actions.style.opacity = showActions ? 1 : 0;
        actions.style.transition = 'opacity .8s';
        actions.style.pointerEvents = showActions ? 'auto' : 'none';
      }
    }
    if (hint) {
      hint.style.opacity = hp > CONFIG.heroScrub.hintFadeAt ? 0 : 1;
      hint.style.transition = 'opacity .4s';
    }
    if (progressBar) progressBar.style.height = `${hp * 100}%`;
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

/* ---------- helpers: scroll to a ScrollTrigger progress ---------- */
const scrollToTriggerProgress = (st, progress) => {
  if (!st) return;
  const y = st.start + (st.end - st.start) * progress;
  if (lenis) lenis.scrollTo(y, { immediate: false });
  else if (gsapReady && typeof ScrollToPlugin !== 'undefined') gsap.to(window, { scrollTo: y, duration: 0.8, ease: 'power2.out' });
  else window.scrollTo({ top: y, behavior: 'smooth' });
};

const setRailStep = (rail, step, total) => {
  if (!rail) return;
  rail.querySelectorAll('.rail-tick').forEach((tick, i) => tick.classList.toggle('is-active', i === step));
};

/* ---------- pillars: ScrollTrigger pin (lateral-step scrub) ---------- */
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

/* ---------- work: editorial type | framed poster | rail ---------- */
(() => {
  const section = document.getElementById('work');
  if (!section || !gsapReady) return;
  const pin = section.querySelector('.work__pin');
  const covers = gsap.utils.toArray('.work-cover', section);
  const posters = gsap.utils.toArray('.work__poster-img', section);
  const ticks = gsap.utils.toArray('.work__rail .rail-tick', section);
  const fill = section.querySelector('.work__rail .rail__fill');
  const rail = section.querySelector('.work__rail');
  const frame = section.querySelector('.work__frame');
  if (!pin || !covers.length) return;

  const setPosterStep = (step, { punch = false } = {}) => {
    posters.forEach((img) => {
      const on = +img.dataset.step === step;
      img.classList.toggle('is-current', on);
      if (on) {
        gsap.fromTo(
          img,
          { autoAlpha: 1, scale: punch ? 1.04 : 1.02 },
          { autoAlpha: 1, scale: 1, duration: punch ? 0.7 : 0.55, ease: 'power3.out', overwrite: 'auto' }
        );
      } else {
        gsap.set(img, { autoAlpha: 0, scale: 1.02 });
      }
    });
  };

  const setWorkStep = (step, { punch = true } = {}) => {
    covers.forEach((el, i) => {
      const on = i === step;
      el.classList.toggle('is-active', on);
      gsap.set(el, { autoAlpha: on ? 1 : 0 });
    });
    setPosterStep(step, { punch });
    setRailStep(rail, step, covers.length);
  };

  const hoverPoster = (step, on) => {
    const img = posters.find((p) => +p.dataset.step === step);
    if (!img || !img.classList.contains('is-current')) return;
    gsap.to(img, {
      scale: on ? 1.03 : 1,
      duration: 0.55,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  };

  const mm = gsap.matchMedia();
  mm.add(
    {
      isDesktop: '(min-width: 769px) and (prefers-reduced-motion: no-preference)',
      isStatic: '(max-width: 768px), (prefers-reduced-motion: reduce)'
    },
    (context) => {
      const { isDesktop, isStatic } = context.conditions;

      if (isStatic) {
        covers.forEach((c) => {
          c.classList.add('is-active');
          gsap.set(c, { clearProps: 'opacity,visibility' });
        });
        posters.forEach((img, i) => {
          const on = i === 0;
          img.classList.toggle('is-current', on);
          gsap.set(img, { autoAlpha: on ? 1 : 0, scale: 1 });
        });
        return;
      }

      if (!isDesktop) return;

      setWorkStep(0, { punch: false });
      let lastStep = 0;

      if (fill) {
        gsap.set(fill, {
          scaleY: 1 / covers.length,
          transformOrigin: 'top center'
        });
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pin,
          start: 'top top',
          end: '+=' + covers.length * 50 + '%',
          pin: true,
          scrub: true,
          id: 'work',
          onUpdate: (self) => {
            const step = Math.min(
              covers.length - 1,
              Math.max(0, Math.round(self.progress * (covers.length - 1)))
            );
            if (step !== lastStep) {
              lastStep = step;
              setWorkStep(step, { punch: true });
            }
          }
        }
      });

      covers.forEach((_, i) => {
        if (i === 0) return;
        tl.to({}, { duration: 0.5 });
      });

      if (fill) {
        tl.to(fill, {
          scaleY: 1,
          ease: 'none',
          duration: Math.max(tl.duration(), 0.01)
        }, 0);
      }
      tl.to({}, { duration: 0.15 });

      ticks.forEach((tick) => {
        tick.addEventListener('click', () => {
          const step = +tick.dataset.step || 0;
          const progress = covers.length <= 1 ? 0 : step / (covers.length - 1);
          scrollToTriggerProgress(tl.scrollTrigger, progress);
        });
      });

      const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (canHover) {
        const bindHover = (el, step) => {
          el.addEventListener('pointerenter', () => hoverPoster(step, true));
          el.addEventListener('pointerleave', () => hoverPoster(step, false));
          el.addEventListener('focus', () => hoverPoster(step, true));
          el.addEventListener('blur', () => hoverPoster(step, false));
        };
        covers.forEach((cover) => bindHover(cover, +cover.dataset.step || 0));
        if (frame) {
          frame.addEventListener('pointerenter', () => hoverPoster(lastStep, true));
          frame.addEventListener('pointerleave', () => hoverPoster(lastStep, false));
        }
      }

      return () => { /* matchMedia cleanup */ };
    }
  );
})();

/* ---------- stats counters + enter stagger ---------- */
(() => {
  const stats = document.querySelectorAll('.stat__n');
  if (!stats.length) return;

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
  stats.forEach(el => io.observe(el));

  if (!gsapReady) return;
  const section = document.getElementById('stats');
  const items = gsap.utils.toArray('.stat', section);
  if (!section || !items.length) return;

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.set(items, { autoAlpha: 0, y: 28 });
    ScrollTrigger.create({
      trigger: section,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        gsap.to(items, {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.1
        });
      }
    });
  });
})();

/* ---------- finale title enter ---------- */
(() => {
  if (!gsapReady) return;
  const title = document.querySelector('.finale__title');
  if (!title) return;
  const lines = gsap.utils.toArray('span', title);
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

/* ---------- custom cursor ---------- */
const cursor = document.querySelector('.cursor');
if (cursor) {
  addEventListener('mousemove', e => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; });
  document.querySelectorAll('a,.work-cover,.btn,.topbar__lang,.rail-tick').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
  });
}

/* ---------- anchor scroll via lenis ---------- */
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const href = a.getAttribute('href');
  if (href.length < 2) { e.preventDefault(); return; } /* bare "#" placeholder links */
  const t = document.querySelector(href);
  if (t) { e.preventDefault(); lenis ? lenis.scrollTo(t) : t.scrollIntoView({ behavior: 'smooth' }); }
}));

/* ---------- CV section reveals (GSAP when available) ---------- */
(() => {
  const nodes = document.querySelectorAll('.doc-reveal');
  if (!nodes.length) return;

  const markIn = () => nodes.forEach((el) => el.classList.add('is-in'));

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    markIn();
    return;
  }

  if (!gsapReady) {
    const revealIo = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        revealIo.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    nodes.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 0.06, 0.24)}s`;
      revealIo.observe(el);
    });
    return;
  }

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    /* Parents stay visible; children carry the motion. Neutralize CSS transition path. */
    gsap.set(nodes, { autoAlpha: 1, y: 0, clearProps: 'transition' });
    markIn();

    const header = document.querySelector('.doc-header');
    if (header) {
      const name = header.querySelector('h1');
      const rest = gsap.utils.toArray('.doc-header__role, .doc-header__actions', header);
      if (name) gsap.set(name, { autoAlpha: 0, y: 28 });
      if (rest.length) gsap.set(rest, { autoAlpha: 0, y: 16 });
      const intro = gsap.timeline({
        scrollTrigger: { trigger: header, start: 'top 85%', once: true }
      });
      if (name) intro.to(name, { autoAlpha: 1, y: 0, duration: 0.75, ease: 'power3.out' });
      if (rest.length) {
        intro.to(rest, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power2.out', stagger: 0.08 }, '-=0.35');
      }
    }

    document.querySelectorAll('.doc-section').forEach((section) => {
      const kicker = section.querySelector('.doc-section__title');
      const body = gsap.utils.toArray(
        '.doc-exp__item, .doc-skills > div, .doc-langs li, .doc-docs__item',
        section
      );

      if (kicker) gsap.set(kicker, { autoAlpha: 0, y: 18 });
      if (body.length) gsap.set(body, { autoAlpha: 0, y: 22 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 78%',
          once: true
        }
      });
      if (kicker) tl.to(kicker, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out' });
      if (body.length) {
        tl.to(body, {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          ease: 'power2.out',
          stagger: 0.08
        }, kicker ? '-=0.25' : 0);
      }
    });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    markIn();
  });
})();
