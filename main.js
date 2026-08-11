/* =====================================================================
   SITE-ENGINE PROTOTYPE v0.1 — flipbook scrubber + PERSONA scaffold
   Everything below CONFIG is archetype-agnostic engine code.
   ===================================================================== */

/* ---------- the cover exists in two forms ----------
   Wide LANDSCAPE viewports get the scrubbed flipbook. Everything narrower —
   phones, and portrait tablets — gets a still cover (the .hero__id portrait
   lockup, see style.css) and downloads not one frame. That is not a
   downgrade for its own sake: the scrubbed sticky was measured in dvh, so
   every time a mobile URL bar collapsed the canvas resized and the
   cover-crop scale jumped, which is the zoom-in/zoom-out you could feel
   while scrolling. A still cover cannot do that.

   SCRUB_MQ must stay in sync with the preload <link media> attributes in
   index.html and with the still-cover media query in style.css. */
const SCRUB_MQ = '(min-width: 901px) and (min-aspect-ratio: 13/20)';
const scrubMQ = matchMedia(SCRUB_MQ);

/* One set, one encoding, and every number in it is load-bearing — see the
   note above FlipbookScrubber for the reasoning. Re-derived from
   assets-in/orbit-a.mp4 (1920x1080, 8s) and orbit-b(1).mp4 (1280x720, 10s):

     ffmpeg -y -i assets-in/orbit-a.mp4 \
       -vf "fps=10,scale=1280:720:flags=lanczos" -q:v 3 \
       site/frames/hero/frame_%04d.jpg
     ffmpeg -y -i "assets-in/orbit-b(1).mp4" \
       -vf "fps=10,scale=1280:720:flags=lanczos" -q:v 3 \
       -start_number 81 site/frames/hero/frame_%04d.jpg

   fps=10 gives 80 + 100 = 180 frames, so the clip seam lands exactly on 80 and
   SEAM_CONFIG.seamFrame derives it via FRAME_SCALE with no edit. 9.7MB total.

   BASELINE JPEG on purpose — not AVIF, not WebP. It is the only choice here
   that optimises decode time rather than bytes, and decode is what a scrubber
   spends 60x a second. Do not "upgrade" this to AVIF to save 4MB; that is the
   change that broke this cover.

   w/h are the frames' own pixel size, declared rather than probed: resize()
   needs them before the first frame has landed. */
const FRAME_SETS = {
  desktop: { path: 'frames/hero/frame_', ext: '.jpg', count: 180, pad: 4, w: 1280, h: 720, poster: 'media/poster.webp' }
};

/* The scrubbed cover is a three-beat sequence on ONE ScrollTrigger-scrubbed
   timeline (no pin — plain position:sticky, so no pin-spacer can perturb it):

     0.00–0.16  cold open — kicker, per-character name, metadata rows write in
     0.16–0.55  the examination — orbit plays, film gauge counts the strip
     0.55–1.00  the seam — existing glitch fires, name flips acid; the
                flipbook's 360 frames finish exactly at 1.0, the same instant
                the sticky releases into #stats                            */
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

/* `geom` is the cover-fit box draw() already computed for this frame — passed
   in rather than recomputed here, so the ghost and slice draws land exactly on
   the base image and this function never has to care whether `img` is an
   ImageBitmap (.width) or an HTMLImageElement (.naturalWidth). */
function drawGlitch(ctx, img, i, seam, cw, ch, geom) {
  const d = Math.abs(i - seam);
  const g = SEAM_CONFIG.glitch;
  if (d >= g.windowFrames) return;

  const t = 1 - d / g.windowFrames;
  const rng = mulberry32(i * 7919);
  const { dx, dy, w, h } = geom;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = g.ghostAlpha * t;
  const shift = g.maxChannelShift * t;
  ctx.drawImage(img, dx - shift, dy, w, h);
  ctx.drawImage(img, dx + shift, dy, w, h);
  ctx.restore();

  /* Displaced scan slices.
     This used to copy each band OUT of the canvas into a scratch canvas and
     back — `drawImage(ctx.canvas, ...)`, i.e. a GPU→CPU→GPU round trip, up to
     six times per frame across the 17 frames around the seam. Reading back
     from the surface you are drawing to forces the pipeline to flush and
     synchronise, and it measured at 9-13ms per frame here against 0.1ms
     everywhere else on the cover: 4.7% of the frames were 98% of the total
     draw cost. That is the stall you could feel in the middle of the scroll.

     The same look comes from re-drawing the SOURCE frame offset horizontally
     and clipped to the band — no readback, no scratch canvas, and it stays on
     the GPU. The rng() call order is unchanged (sh, sy, offsetX), so every
     frame's slices land exactly where they always did. */
  const sliceCount = Math.floor(t * g.maxSlices);
  for (let n = 0; n < sliceCount; n++) {
    const sh = 8 + Math.floor(rng() * (g.maxSliceHeight - 8 + 1));
    const maxY = ch - sh;
    const sy = maxY > 0 ? Math.floor(rng() * maxY) : 0;
    const offsetX = Math.floor((rng() * 2 - 1) * g.maxSliceOffset * t);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, sy, cw, sh);
    ctx.clip();
    ctx.drawImage(img, dx + offsetX, dy, w, h);
    ctx.restore();
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
   Every frame is an <img>, created once, held for the life of the page.
   Nothing is fetched on demand, nothing is evicted, and there is no second
   resolution to fall back to. That is GSAP's own imageSequenceScrub shape and
   it is the shape this cover had when it last worked.

   It is a deliberate rewrite BACK to that. What it replaces was a three-tier
   windowed loader — compressed blobs, a permanent 640px ladder, an evicted
   full-res window, two pump queues — and it failed the way every windowed
   scrubber fails: fine when you scroll slowly, because the decoder keeps up;
   at speed the playhead outruns it, the cover drops to the blurry tier and the
   queue thrashes. Measured on that build: 29.7fps, 498 decodes and 687
   evictions for ONE sweep, while draw() itself cost 0.1ms and the main thread
   never blocked once. The canvas was never the bottleneck. Asking the decoder
   for work it could not finish in time was.

   Holding everything is affordable because of the FRAME SET, not this code:
   180 frames of 1280x720 baseline JPEG, 9.7MB total (see FRAME_SETS). The
   numbers that matter and why they are what they are:

     · 180 frames over a 290vh scrub = 14.5px/frame at a 900px viewport.
       Apple's AirPods sequence runs 18.5px/frame; the reference band is
       18-24. The old 360 ran 7.25 — 2.5x denser than any shipped reference,
       demanding up to ~90 unique decodes per second of scrolling, more than
       a display can even present.
     · Baseline JPEG, not AVIF. AVIF decodes 5-10x slower, and in a scrubber
       the decode is on the critical path 60x/sec. AVIF was chosen for bytes,
       which is the wrong axis for this one asset.
     · 1280x720 is the source's own resolution: orbit-b(1).mp4 is natively
       720p and was being upscaled to 1600x900 for 200 of the 360 frames —
       decode and memory spent on invented pixels. resize() below already
       refuses a backing store the frames cannot fill.

   Also: <img src> is not subject to CORS, so this works when index.html is
   opened straight off disk as file://, where window.fetch() is rejected
   outright. The loader this replaces could not run there at all. */
class FlipbookScrubber {
  /* How far nearestLoaded() searches for a usable neighbour. Only matters in
     the first seconds, before the whole strip has landed — after that the
     exact frame is always there. */
  static SEARCH_RADIUS = 12;
  /* Frames requested at high priority. Past this the browser's own scheduler
     does the ordering that the hand-rolled ladder and six-slot queue existed
     to do, and does it with knowledge of the actual connection. */
  static EAGER = 24;

  constructor(canvas, cfg, glitchEl = null) {
    this.canvas = canvas;
    /* alpha:false — draw() is cover-fit, so every pixel of the backing store
       is painted every frame and the alpha channel is dead weight the
       compositor still has to blend. */
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.cfg = cfg;
    this.glitchEl = glitchEl;
    this.count = cfg.count;
    this.images = new Array(this.count).fill(null);
    this.loaded = new Set();   /* indices that have loaded AND decoded */
    this.targetIdx = 0;
    this.displayIdx = 0;
    this.lastStepIdx = -1;
    this.painted = -1;
    this.poster = null;
    /* the frames' own pixel size, declared on the frame set. resize() needs it
       to refuse a backing store bigger than the source. */
    this.frameW = cfg.w || 0;
    this.frameH = cfg.h || 0;
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
    this.preload();
  }
  src(i) {
    const n = String(i + 1).padStart(this.cfg.pad, '0');
    return `${this.cfg.path}${n}${this.cfg.ext}`;
  }
  /* All of them, right now, in index order. No queue: 180 requests is well
     inside what the browser schedules better than we can, and fetchPriority
     tells it which end of the strip is needed first.

     decode() is awaited before an index counts as loaded. Without it the first
     draw of each frame pays its decode on the critical path — the exact stall
     this class exists to avoid — and with it the browser's decoded-image cache
     is warm before the playhead ever arrives. */
  preload() {
    for (let i = 0; i < this.count; i++) {
      const img = new Image();
      img.decoding = 'async';
      if ('fetchPriority' in img) img.fetchPriority = i < FlipbookScrubber.EAGER ? 'high' : 'low';
      this.images[i] = img;
      img.onload = () => {
        const done = () => {
          this.loaded.add(i);
          const active = Math.round(this.displayIdx);
          /* repaint only if this frame is at or near the playhead — or if
             nothing has been painted yet, so the first frame to land shows */
          if (this.painted < 0 || Math.abs(i - active) <= FlipbookScrubber.SEARCH_RADIUS) {
            this.draw(active);
          }
        };
        if (img.decode) img.decode().then(done).catch(done);
        else done();
      };
      img.onerror = () => { this.images[i] = null; };
      img.src = this.src(i);
    }
  }
  redraw() {
    if (!this.resize()) return;
    this.lastStepIdx = -1;
    this.draw(Math.round(this.displayIdx));
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
  /* Exact frame first, then outward. Once the strip has landed this returns
     `i` on the first line every time; the search only earns its keep during
     the opening seconds. */
  nearestLoaded(i) {
    if (this.loaded.has(i)) return i;
    const r = FlipbookScrubber.SEARCH_RADIUS;
    for (let d = 1; d <= r; d++) {
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
     canvas and every single draw upscaled the source by ~1.8x — over three
     times the fill rate, for detail the frames do not contain. Clamping so the
     cover-fit scale never exceeds 1 costs nothing visually (the compositor
     performs the final scale instead of drawImage, with the same filtering).

     Note the Math.max(1, …) floor: it caps the backing store at 1 CSS pixel
     per canvas pixel but will not go BELOW it. So on a display wider than the
     720p source the clamp is inert and drawImage does a mild upscale (1440x900
     canvas from a 1280x720 frame = 1.25x). That is deliberate — the seam
     glitch and scanlines are drawn in canvas space, and shrinking the surface
     under them would soften those, which is a worse trade than 36% more fill
     rate on a draw that measures 0.1ms. */
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
    this.buildBloom();
    return true;
  }
  /* The seam bloom depends only on canvas size, but it was being rebuilt with
     createRadialGradient() on EVERY frame inside the seam window. Built here
     instead, at full opacity — draw() scales it with globalAlpha. */
  buildBloom() {
    const { bloomCenterX, bloomCenterY, bloomEdgeAlpha, color } = SEAM_CONFIG;
    const cw = this.canvas.width, ch = this.canvas.height;
    const cx = cw * bloomCenterX, cy = ch * bloomCenterY;
    const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cw, ch) * 0.55);
    g.addColorStop(0, rgbaAlpha(color, 1));
    g.addColorStop(1, rgbaAlpha(color, bloomEdgeAlpha));
    this.bloom = g;
  }
  draw(i) {
    const j = this.nearestLoaded(i);
    if (j < 0) {
      if (this.poster && this.painted < 0) this.drawPoster();
      return;
    }
    const img = this.images[j];
    if (!img) { this.painted = -1; return; }
    this.painted = j;
    const cw = this.canvas.width, ch = this.canvas.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const s = Math.max(cw / iw, ch / ih);
    const w = iw * s, h = ih * s;
    const geom = { dx: (cw - w) / 2, dy: (ch - h) / 2, w, h };
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, geom.dx, geom.dy, w, h);

    const seam = SEAM_CONFIG.seamFrame;
    drawGlitch(this.ctx, img, i, seam, cw, ch, geom);

    const flashAlpha = seamFlashAlpha(i, seam);
    if (flashAlpha > 0) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      /* the gradient is built once per canvas size in resize(); only its
         opacity varies per frame, and globalAlpha scales both stops by the
         same factor the old per-frame colour stops did */
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = this.bloom;
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
  }
  /* The smoothing lives in ScrollTrigger's scrub. The old `delta * 0.4` lerp
     was per-rAF, so it caught up roughly twice as fast on a 120Hz display as
     on a 60Hz one — the same page felt like two different animations. scrub is
     time-based and frame-rate normalised. Keeping both would stack two lags,
     so this only paints when the index changes. */
  step() {
    this.displayIdx = this.targetIdx;
    const i = Math.round(this.displayIdx);
    if (i !== this.lastStepIdx || this.painted !== i) {
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
    'nav.menuOpen': 'Open menu',
    'nav.menuClose': 'Close menu',
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
    'nav.menuOpen': 'Menü öffnen',
    'nav.menuClose': 'Menü schließen',
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

/* ---------- hero: name split + scrub bindings ----------
   The old progressOf() helper is gone: ScrollTrigger now owns the cover's
   scrub range, computed from the same two layout values it used (section
   height minus sticky height), so progress still cannot be perturbed by a
   URL bar collapsing mid-scroll. */
const orbitCanvas = document.getElementById('orbit-canvas');
const hero = document.getElementById('hero');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- mobile/tablet drawer nav (≤1024px) ----------
   Replaces the sparse mobile topbar (which used to be just "Start a
   project" + EN/DE) and takes over .sheetbar's section-jump job below the
   breakpoint (style.css sets .sheetbar{display:none} there).

   Built around GSAP's "Timeline: Clear and Rebuild" technique
   (https://demos.gsap.com/demo/timeline-clear-and-rebuild/): ONE persistent
   paused timeline, rebuilt via .clear() + re-added tweens rather than
   thrown away and recreated, whenever its parameters actually change (here:
   the stagger timing, derived from measured panel height, which can shift
   on an in-range resize — a tablet's split-screen mode, a resizable desktop
   window narrowed into this band — without ever leaving the ≤1024px query
   gsap.matchMedia() is scoped to below). Raw DOM listeners (toggle, close
   button, scrim, Escape, Tab-trap) are bound once at the IIFE's top level,
   outside mm.add() — matchMedia reverts GSAP objects automatically but not
   plain listeners, and this file already has a documented bug class around
   that for a different feature, so the drawer doesn't repeat it. */
(() => {
  const toggle = document.getElementById('menu-toggle');
  const drawer = document.getElementById('drawer');
  const panel = drawer && drawer.querySelector('.drawer__panel');
  const scrim = document.getElementById('drawer-scrim');
  const closeBtn = document.getElementById('drawer-close');
  const langSlot = document.getElementById('drawer-lang-slot');
  if (!toggle || !drawer || !panel || !scrim || !closeBtn || !gsapReady) return;

  const root = document.documentElement;
  let tl = null;
  let isOpen = false;
  let lastFocused = null;
  let langHome = null; // { parent, next } — where #lang-toggle lives outside the drawer

  const setToggleLabel = (open) => {
    const key = open ? 'nav.menuClose' : 'nav.menuOpen';
    const dict = I18N[currentLang] || I18N.en;
    toggle.setAttribute('aria-label', dict[key]);
  };

  function open() {
    if (isOpen || !tl) return;
    isOpen = true;
    lastFocused = document.activeElement;
    drawer.removeAttribute('inert');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.classList.add('is-open');
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add('is-visible'));
    toggle.setAttribute('aria-expanded', 'true');
    setToggleLabel(true);
    root.classList.add('menu-open');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
    tl.play();
    closeBtn.focus();
  }

  function close() {
    if (!isOpen || !tl) return;
    isOpen = false;
    drawer.setAttribute('aria-hidden', 'true');
    scrim.classList.remove('is-visible');
    toggle.setAttribute('aria-expanded', 'false');
    setToggleLabel(false);
    root.classList.remove('menu-open');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    tl.eventCallback('onReverseComplete', () => {
      drawer.setAttribute('inert', '');
      drawer.classList.remove('is-open');
      scrim.hidden = true;
    });
    tl.reverse();
    (lastFocused || toggle).focus();
  }

  const mm = gsap.matchMedia();
  mm.add(
    {
      isActive: '(max-width: 1024px)',
      reduceMotion: '(prefers-reduced-motion: reduce)'
    },
    (context) => {
      const { isActive, reduceMotion } = context.conditions;
      if (!isActive) return; /* desktop: nothing to build; auto-revert cleans up the previous context */

      const items = [...panel.querySelectorAll(
        '.drawer__jump-link, .drawer__actions .btn, .drawer__lang-slot, .drawer__contact li'
      )];

      const build = () => {
        if (!tl) tl = gsap.timeline({ paused: true });
        tl.clear(); /* strip tweens, keep the same instance/progress semantics */
        if (reduceMotion) {
          /* duration:0 keeps the open/close STATE MACHINE intact (play()
             still reaches "open", reverse() still reaches "closed") — just
             with no visible motion, so onReverseComplete still fires and
             inert/aria-hidden restoration still works correctly */
          tl.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0 }, 0)
            .fromTo(items, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0 }, 0);
          return;
        }
        const h = panel.clientHeight || window.innerHeight;
        const staggerEach = Math.min(0.07, Math.max(0.03, h / 9000));
        tl.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.45, ease: 'power3.out' }, 0)
          .fromTo(items, { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out', stagger: staggerEach }, 0.08);
      };

      build();

      const onResize = () => {
        const progress = tl.progress();
        build(); /* clear + rebuild against the SAME tl instance, fresh stagger timing */
        tl.progress(isOpen ? 1 : (progress > 0 ? progress : 0));
      };
      window.addEventListener('resize', onResize);

      return () => {
        window.removeEventListener('resize', onResize);
        if (isOpen) {
          isOpen = false;
          root.classList.remove('menu-open');
          document.body.style.overflow = '';
          if (lenis) lenis.start();
          drawer.setAttribute('inert', '');
          drawer.setAttribute('aria-hidden', 'true');
          drawer.classList.remove('is-open');
          scrim.hidden = true;
          scrim.classList.remove('is-visible');
          toggle.setAttribute('aria-expanded', 'false');
          setToggleLabel(false);
        }
        if (tl) { tl.kill(); tl = null; }
      };
    }
  );

  toggle.addEventListener('click', () => (isOpen ? close() : open()));
  closeBtn.addEventListener('click', close);
  scrim.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    /* queried live, not cached — #lang-toggle can be inside or outside the
       drawer depending on viewport, and a stale snapshot would silently
       drop it from the trap */
    const f = [...drawer.querySelectorAll('a, button')].filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* close-then-scroll: don't duplicate scroll logic here — the pre-existing
     global a[href^="#"] handler (below, near EOF) already preventDefaults
     and runs lenis.scrollTo on these SAME static anchors. This listener
     only tears the drawer down; both fire on the same click. */
  drawer.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', close));

  /* #lang-toggle: relocate (not clone) into the drawer ≤1024px. applyLang()
     and its click handler both resolve a single node via
     getElementById('lang-toggle') — a duplicate id would break that, so the
     existing node moves instead; appendChild/insertBefore preserve its
     already-bound listeners. */
  const relocateMQ = matchMedia('(max-width: 1024px)');
  const placeLangToggle = (intoDrawer) => {
    if (!langToggle || !langSlot) return;
    if (intoDrawer && langToggle.parentElement !== langSlot) {
      langHome = { parent: langToggle.parentElement, next: langToggle.nextSibling };
      langSlot.appendChild(langToggle);
    } else if (!intoDrawer && langHome && langToggle.parentElement === langSlot) {
      langHome.parent.insertBefore(langToggle, langHome.next);
      langHome = null;
    }
  };
  placeLangToggle(relocateMQ.matches);
  if (relocateMQ.addEventListener) relocateMQ.addEventListener('change', (e) => placeLangToggle(e.matches));
})();

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
  const gaugeFill = document.getElementById('gauge-fill');
  const S = CONFIG.heroScrub;

  /* Which cover? The flipbook needs a wide landscape viewport, GSAP, and a
     user who has not asked for less motion. Anything else gets the still
     cover — which is a real cover with its own ID portrait, not a fallback. */
  const wantsScrub = scrubMQ.matches && gsapReady && !reduced && !!orbitCanvas;
  /* leaves a readable answer in the DOM for QA — which cover was chosen, and
     what the viewport looked like when it was chosen */
  hero.dataset.cover = wantsScrub ? 'scrub' : 'still';

  if (!wantsScrub) {
    /* ---------- the still cover ----------
       The class is what CSS hangs the static layout off for the reduced-motion
       and no-GSAP cases; narrow viewports get the same rules from a media
       query, so the still cover also survives JS never running at all. */
    hero.classList.add('hero--still');
    if (heroName) heroName.classList.add('is-post-seam');
    if (actions) actions.style.pointerEvents = 'auto';

    const show = [kicker, sub, actions, idFig].filter(Boolean);
    if (gsapReady && !reduced) {
      /* a one-shot entrance, not a scroll-linked one — nothing here is
         allowed to depend on scroll position, which is the whole point */
      /* y:0 is load-bearing. CSS parks .ch at translateY(110%), which computes
         to ~48px; GSAP reads the matrix, cannot tell it was a percentage, and
         records it as y:48px. Animating yPercent alone then leaves that 48px
         behind — and .hero__line is overflow:hidden, so every character ends
         up clipped out of sight. Zeroing y explicitly claims the axis. */
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
    /* ---------- the scrubbed cover ---------- */
    const scrubber = new FlipbookScrubber(orbitCanvas, CONFIG.frames, heroName);
    /* exposed the same way, and for the same reason, as window.__lenis above:
       the stutter this loader was rewritten to fix is only observable as a gap
       between the frame the cover WANTS (displayIdx) and the one it actually
       painted, and neither is reachable from outside this closure. QA reads
       Math.round(displayIdx) - painted while scrolling; once the strip has
       landed it must be 0 at every speed, because there is no coarse tier to
       fall back to any more. `loaded.size === count` says the strip is in. */
    window.__scrubber = scrubber;
    if (gaugeTotal) gaugeTotal.textContent = String(scrubber.count);

    /* One scrubbed timeline drives everything. The old loop wrote transform
       and opacity onto all 14 name characters, the kicker, the sub, five
       metadata rows and the actions block on EVERY rAF whether or not the
       value had changed — roughly 25 style writes per frame, forever. GSAP
       writes only what actually moved, and only while the timeline is live.

       No pin: `end` is computed from the same two layout values the old
       progressOf() used, so the range stays immune to URL-bar resizing and
       nothing downstream inherits a pin-spacer. */
    const clock = { p: 0 };
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: () => '+=' + Math.max(1, hero.offsetHeight - heroSticky.offsetHeight),
        scrub: 0.55,
        invalidateOnRefresh: true,
        /* First thing on the page, so it refreshes first. ScrollTrigger
           refreshes in CREATION order unless told otherwise, and this file
           does not create them in page order — the sheet counter's triggers
           point at #hero and #stats but are built last, after the #pillars
           pin has already injected a pin-spacer and changed document height.
           A refresh fires on document.fonts.ready and on plate-image load,
           i.e. after first paint, and out-of-order refresh with a pin in the
           middle is exactly how you get a scroll jump. */
        refreshPriority: -3
      }
    });

    /* the clock: total duration 1, so every position below reads directly as
       a fraction of cover progress and CONFIG.heroScrub stays meaningful */
    tl.to(clock, { p: 1, duration: 1 }, 0);

    /* beat 1 — the name writes itself in, character by character */
    const charSpan = Math.max(0.02, S.nameRevealEnd - 0.06);
    /* y:0 on both ends — see the note in the still branch: CSS parks .ch at
       translateY(110%), GSAP reads that back as ~48 pixels, and yPercent
       alone would leave the residual inside an overflow:hidden line box */
    tl.fromTo(chars,
      { yPercent: 110, y: 0, opacity: 0 },
      { yPercent: 0, y: 0, opacity: 1, duration: 0.06,
        stagger: charSpan / Math.max(1, chars.length - 1) }, 0);

    if (kicker) tl.fromTo(kicker, { opacity: 0 }, { opacity: 1, duration: 0.035 }, S.kickerRevealAt);
    if (sub) tl.fromTo(sub, { opacity: 0 }, { opacity: 1, duration: 0.045 }, S.subRevealAt);

    /* beat 1b — metadata rows write in one at a time, staggered by SCROLL
       position rather than by a timer, so scrubbing back un-writes them */
    if (metaRows.length) {
      const span = Math.max(0.02, S.metaEnd - S.metaStart);
      tl.fromTo(metaRows, { opacity: 0 },
        { opacity: 1, duration: span / 2,
          stagger: (span / 2) / Math.max(1, metaRows.length - 1) }, S.metaStart);
    }
    if (actions) tl.fromTo(actions, { opacity: 0 }, { opacity: 1, duration: 0.05 }, S.actionsRevealAt);
    if (hint) tl.fromTo(hint, { opacity: 1 }, { opacity: 0, duration: 0.035 }, S.hintFadeAt);

    /* beat 2 — the film gauge. scaleY, not height: a transform cannot
       invalidate layout, and this bar redraws on every frame of the cover. */
    if (gaugeFill) tl.fromTo(gaugeFill, { scaleY: 0 }, { scaleY: 1, duration: 1 }, 0);

    /* The canvas rides gsap.ticker — the same clock Lenis and ScrollTrigger
       already share, so there is exactly one rAF loop on the page. Both
       writes below are gated on an actual change.

       DO NOT gate this on the trigger's progress. That was tried and it is a
       guaranteed freeze: ScrollTrigger's `progress` is derived from the SCROLL
       POSITION and reaches 1 the instant you pass the cover, but `clock.p` is
       the SCRUBBED value and is still up to `scrub` seconds behind it. Skipping
       the body once progress hits 1 therefore abandons the catch-up half-done
       and leaves the canvas stopped on whatever frame it had reached. The work
       avoided below the fold is a few no-op comparisons; the bug it buys is the
       cover visibly sticking at the end of every pass. */
    let lastLabel = '';
    let actionsOn = null;
    /* The try/catch is not defensive padding. gsap.ticker walks ONE callback
       list, and Lenis and ScrollTrigger are on it (see the setup at the top of
       this file) — so an exception thrown in here does not just stop the
       canvas, it takes out smooth scrolling and every animation on the page in
       the same tick. Reported once: a per-frame console.error is its own
       freeze. */
    let tickErrored = false;
    gsap.ticker.add(() => {
      try {
        scrubber.setProgress(clock.p);
        scrubber.step();

        if (gaugeCur) {
          const n = Math.min(scrubber.count, Math.round(clock.p * (scrubber.count - 1)) + 1);
          const label = String(n).padStart(3, '0');
          if (label !== lastLabel) { lastLabel = label; gaugeCur.textContent = label; }
        }
        if (actions) {
          const on = clock.p > S.actionsRevealAt;
          if (on !== actionsOn) {
            actionsOn = on;
            actions.style.pointerEvents = on ? 'auto' : 'none';
          }
        }
      } catch (err) {
        if (!tickErrored) {
          tickErrored = true;
          console.error('[hero scrub] tick failed; the cover may stall', err);
        }
      }
    });
  }

  /* Crossing the scrub/still threshold (a rotation, or a window dragged past
     900px) swaps which cover is correct, and neither can be rebuilt in place
     — the still one has no canvas and the scrubbed one has no portrait.

     The same check also self-corrects a decision made too early. main.js runs
     at the end of <body>, which is normally after layout has settled, but not
     always: a panel that animates open, a window restoring its size, devtools
     docking, all resize the viewport a beat later. Getting it wrong used to
     be permanent — the still cover would sit there on a wide desktop with no
     way back. The sessionStorage latch means one correction, never a loop. */
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

  /* Anton/Instrument Sans loading late changes hero.offsetHeight after the
     scrub ScrollTrigger already measured its `end` from it (main.js above,
     `end: () => '+=' + (hero.offsetHeight - heroSticky.offsetHeight)`), and
     nothing else on the page forces a refresh once that happens — the only
     existing ScrollTrigger.refresh() call is gated on `.plate img` loads,
     which is unrelated. One refresh once fonts settle keeps the scrub range
     matched to final layout without adding a second reload path. */
  if (gsapReady && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
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
          /* the pin injects a spacer and changes document height, so it must
             refresh before anything created later that measures against the
             page below it (see the note on the cover's refreshPriority) */
          refreshPriority: -1,
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
          refreshPriority: 0,
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

/* ---------- 03 · selected work: floating hover preview ----------
   The sticky plate on the left is idle-only now: it loops media/closer.mp4
   via the shared [data-video] machinery below and never reacts to hover, so
   its caption stays "PLATE A · STUDIO / CLOSER.MP4".

   The preview instead flies to the RIGHT EDGE of whichever row is hovered
   and tracks the pointer's Y — the picture stays beside the title the eye is
   already on. One card is reused by every row; each row's poster/clip/caption
   come from the data-* attributes it already carried.

   Position is absolute inside .worx (not fixed) so the card stays glued to
   its row while the page scrolls under a stationary pointer. Everything the
   pointer drives is transform-only, via quickTo — one reused tween per axis
   rather than a new tween per pointermove. */
(() => {
  const section = document.getElementById('work');
  const worx = section && section.querySelector('.worx');
  const float = document.getElementById('worx-float');
  const floatFrame = document.getElementById('worx-float-frame');
  const poster = document.getElementById('worx-float-poster');
  const rows = [...document.querySelectorAll('.worx__row')];
  if (!section || !worx || !float || !floatFrame || !rows.length) return;
  if (typeof gsap === 'undefined') return; /* no GSAP: rows keep their inline .worx__media posters */

  const capLabel = document.getElementById('worx-float-label');
  const capSrc = document.getElementById('worx-float-src');

  /* the 1000px arm matches .worx__float's own media query — below it the card
     is display:none and the rows show their inline posters, so a narrow
     desktop window must not try to fly a zero-width card around */
  const canHover = () =>
    matchMedia('(hover: hover) and (pointer: fine)').matches &&
    matchMedia('(min-width: 1000px)').matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.set(float, { autoAlpha: 0, scale: 0.96 });
  const xTo = gsap.quickTo(float, 'x', { duration: 0.45, ease: 'power3.out' });
  const yTo = gsap.quickTo(float, 'y', { duration: 0.55, ease: 'power3.out' });
  /* the tilt is pointer VELOCITY, not position — the card leans into the
     direction of travel and settles flat when the hand stops */
  const rotTo = gsap.quickTo(float, 'rotation', { duration: 0.7, ease: 'power3.out' });

  const videoCache = new Map(); // slug -> { el, failed }
  let activeVideo = null;
  let leaveTimer = 0;
  let currentRow = null;
  let revealTl = null;
  let lastY = 0;
  let lastT = 0;
  let tiltTimer = 0;

  function getPreviewVideo(row, preload = 'auto') {
    const slug = row.id;
    let entry = videoCache.get(slug);
    if (entry) return entry;
    const el = document.createElement('video');
    el.className = 'worx__float-video';
    el.muted = true;
    /* All four clips are frame-locked loops now (The Meridian's one-way
       descent was replaced by the agency site's own loop), so no row carries
       data-preview-loop="false" any more. The opt-out stays wired: it costs a
       comparison and it is the only way a future non-looping clip can be
       dropped in without editing this file. */
    el.loop = row.dataset.previewLoop !== 'false';
    el.playsInline = true;
    /* Warmed BEFORE the first hover (see the warm-up block at the end of this
       IIFE). It used to be 'metadata' on an element created by the hover
       itself, which meant the first hover on every row sat on its poster for as
       long as the fetch + decode took — long enough to read as "the preview
       doesn't do anything".

       But warming all four at 'auto' puts SEVEN live video decoders on the page
       next to the hero flipbook's decoded-frame budget, and that combination is
       what froze both. The caller decides the level now: the first row buffers
       fully, the rest take 'metadata' (which still resolves DNS, the connection
       and the container, i.e. the part hover latency was actually made of) and
       upgrade themselves the moment a pointer lands on them. */
    el.preload = preload;
    el.setAttribute('muted', '');
    el.setAttribute('playsinline', '');
    entry = { el, failed: false };
    videoCache.set(slug, entry);
    el.addEventListener('error', () => { entry.failed = true; }, { once: true });
    el.src = row.dataset.preview;
    floatFrame.appendChild(el);
    return entry;
  }

  /* Park the card against the hovered row. clientY is optional: keyboard
     focus has no pointer, so the card centres on the row instead. */
  function place(row, clientY, animate) {
    const wr = worx.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    const cw = float.offsetWidth;
    const ch = float.offsetHeight;

    const x = (rr.right - wr.left) - cw;
    const top = rr.top - wr.top;
    const minY = top + 10;
    const maxY = top + rr.height - ch - 10;

    let y;
    if (clientY == null || maxY <= minY) y = top + (rr.height - ch) / 2;
    else y = Math.max(minY, Math.min(maxY, (clientY - wr.top) - ch / 2));

    if (animate) {
      xTo(x); yTo(y);
    } else {
      gsap.set(float, { x, y });
    }
    return y;
  }

  function setIdle() {
    currentRow = null;
    if (revealTl) revealTl.kill();
    revealTl = gsap.to(float, {
      autoAlpha: 0, scale: 0.96, rotation: 0,
      duration: 0.3, ease: 'power2.in'
    });
    if (activeVideo) {
      activeVideo.el.classList.remove('is-active');
      activeVideo.el.pause();
      activeVideo = null;
    }
  }

  function activate(row, clientY) {
    clearTimeout(leaveTimer);
    const first = currentRow !== row;
    currentRow = row;

    if (capLabel) capLabel.textContent = row.dataset.capLabel || '';
    if (capSrc) capSrc.textContent = row.dataset.capSrc || '';

    if (activeVideo) {
      activeVideo.el.classList.remove('is-active');
      activeVideo.el.pause();
      activeVideo = null;
    }
    if (poster && row.dataset.poster) poster.src = row.dataset.poster;

    if (first) {
      /* jump to the new row rather than sliding across the whole list */
      place(row, clientY, false);
      if (revealTl) revealTl.kill();
      revealTl = gsap.timeline()
        .to(float, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power3.out' }, 0)
        .fromTo(floatFrame,
          { clipPath: 'inset(0% 0% 100% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'power3.out' }, 0);
    } else {
      place(row, clientY, true);
    }

    if (!row.dataset.preview) return;
    const entry = getPreviewVideo(row);
    activeVideo = entry;
    if (entry.failed) return; // stays on the poster — graceful fallback
    /* the upgrade half of the staggered warm-up above: this row is being looked
       at, so it earns a full buffer */
    if (entry.el.preload !== 'auto') {
      entry.el.preload = 'auto';
      entry.el.load();
    }
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
    row.addEventListener('mouseenter', (e) => { if (canHover()) activate(row, e.clientY); });
    row.addEventListener('mousemove', (e) => {
      if (!canHover() || currentRow !== row) return;
      place(row, e.clientY, true);
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0 && dt < 200) {
        rotTo(gsap.utils.clamp(-4, 4, (e.clientY - lastY) * 0.22));
      }
      lastY = e.clientY;
      lastT = now;
      /* velocity only exists while the hand is moving — without this the card
         would hold its last tilt indefinitely once the pointer stopped */
      clearTimeout(tiltTimer);
      tiltTimer = setTimeout(() => rotTo(0), 90);
    }, { passive: true });
    row.addEventListener('mouseleave', () => { if (canHover()) scheduleLeave(); });
    row.addEventListener('focusin', () => { if (canHover()) activate(row, null); });
    row.addEventListener('focusout', () => { if (canHover()) scheduleLeave(); });
  });

  /* a resize mid-hover would leave the card measured against the old grid */
  addEventListener('resize', () => { if (currentRow) place(currentRow, null, false); });

  /* ---- warm-up ----
     Build the four clips as #work approaches, so a hover only has to play()
     something whose connection is already open. 35% lead margin and a 300ms
     stagger are the same demand-shaping the background plate videos use below
     (see the note there): #pillars' builder.mp4 and #work's closer.mp4 are 12MB
     combined and can intersect in the same batch, and four more videos landing
     on top of that in one tick is exactly what that note was written about.

     Only the FIRST clip buffers fully. The other three take 'metadata' and
     upgrade on hover (see enter() above). Four full buffers plus the two plates
     is seven simultaneous video decoders, arriving right as the hero flipbook
     is at its own memory peak — that is the pairing that froze the cover and
     the previews together, and the second half of the fix for it.

     Gated on canHover() — below 1000px the float is display:none and the rows
     use the .worx__media carousel instead, so warming these would be four
     downloads for something that never renders. */
  if (canHover()) {
    let warmed = 0;
    const warmIo = new IntersectionObserver((entries) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      warmIo.disconnect();
      rows.forEach((row) => {
        if (!row.dataset.preview) return;
        const n = warmed++;
        setTimeout(() => getPreviewVideo(row, n === 0 ? 'auto' : 'metadata'), n * 300);
      });
    }, { rootMargin: '35% 0px' });
    warmIo.observe(section);
  }
})();

/* ---------- 03 · selected work: the mobile media carousel ----------
   Below 1000px the floating hover card is display:none and there is no pointer
   to follow, so each row's .worx__media becomes a stepped carousel instead of
   the single static poster it used to be: the project's three stills, preceded
   by its preview clip where one exists (data-clip).

   Two constraints shaped this:

   1. The buttons are real <button>s, and .worx__media is a SIBLING of the
      row's <a> (see index.html) — interactive controls inside a link is
      invalid, and on touch it means every arrow tap also navigates away.

   2. Nothing here may add VISIBLE TEXT. _verify/redesign/extract-text.js locks
      every word on the page and reads it with body.innerText — which still
      sees clip-rect'd "visually hidden" copy (that is why the pre-existing
      .xref__body shows up in the baseline). So there is no live region here:
      the arrows are SVG chevrons, and the position rides in each button's
      OWN aria-label, which the harness collects into a separate block. A
      screen reader gets "Next image, Sonnwerk, 2 of 4"; innerText gets
      nothing at all.

   The clip slide is handed to the shared [data-video] machinery further down
   (it carries data-video, and that querySelectorAll runs after this IIFE) so
   it inherits lazy loading, the load stagger, iOS autoplay attributes and the
   low-power retry rather than growing a second copy of all of that. */
(() => {
  const mounts = [...document.querySelectorAll('.worx__media[data-shots]')];
  if (!mounts.length) return;

  const CHEVRON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M15 4L7 12l8 8" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="square"/></svg>';

  mounts.forEach((mount) => {
    const shots = (mount.dataset.shots || '').split(',').map((s) => s.trim()).filter(Boolean);
    const clip = mount.dataset.clip || '';
    const label = mount.dataset.mediaLabel || '';
    if (!shots.length) return;

    /* slide descriptors: the clip first where present, then the stills */
    const slides = (clip ? [{ type: 'video', src: clip }] : [])
      .concat(shots.map((src) => ({ type: 'image', src })));
    const total = slides.length;

    const frag = document.createElement('div');
    frag.className = 'worx__car';
    frag.innerHTML =
      '<div class="worx__car-window plate__frame plate__frame--wide">' +
        '<div class="worx__car-track"></div>' +
      '</div>' +
      '<div class="worx__car-bar">' +
        '<button type="button" class="worx__car-btn worx__car-btn--prev">' + CHEVRON + '</button>' +
        '<ol class="worx__car-dots"></ol>' +
        '<button type="button" class="worx__car-btn worx__car-btn--next">' + CHEVRON + '</button>' +
      '</div>';

    const track = frag.querySelector('.worx__car-track');
    const dotList = frag.querySelector('.worx__car-dots');
    const prev = frag.querySelector('.worx__car-btn--prev');
    const next = frag.querySelector('.worx__car-btn--next');

    slides.forEach((s, n) => {
      const cell = document.createElement('div');
      cell.className = 'worx__car-cell';
      if (s.type === 'video') {
        /* data-video, not a <video> — the shared loader below owns the src.
           .bg-placeholder is what shows until it has decoded a frame. */
        cell.dataset.video = s.src;
        cell.innerHTML = '<div class="bg-placeholder bg-placeholder--builder"></div>';
      } else {
        /* only the first still is eager; the rest are one arrow-press away and
           must not compete with the row above them for bandwidth */
        cell.innerHTML =
          '<img src="' + s.src + '" alt="" width="1000" height="562" decoding="async"' +
          (n <= 1 ? '' : ' loading="lazy"') + '>';
      }
      track.appendChild(cell);

      const dot = document.createElement('li');
      dot.className = 'worx__car-dot';
      dotList.appendChild(dot);
    });
    const dots = [...dotList.children];
    const cells = [...track.children];

    mount.innerHTML = '';
    mount.appendChild(frag);

    let idx = 0;
    const clipCell = clip ? cells[0] : null;

    const render = () => {
      track.style.transform = 'translate3d(' + (-idx * 100) + '%,0,0)';
      dots.forEach((d, n) => d.classList.toggle('is-live', n === idx));
      cells.forEach((c, n) => c.setAttribute('aria-hidden', n === idx ? 'false' : 'true'));
      prev.disabled = idx === 0;
      next.disabled = idx === total - 1;
      /* the clip is only worth decoding while it is the slide on screen */
      if (clipCell) {
        const v = clipCell.querySelector('video');
        if (v) {
          if (idx === 0) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
          else if (!v.paused) v.pause();
        }
      }
      /* the position lives here rather than in a live region — see the note at
         the top of this IIFE. Focus stays on the button across a press, so an
         updated label is what actually gets re-announced. */
      const at = ', ' + (idx + 1) + ' of ' + total;
      prev.setAttribute('aria-label', 'Previous image, ' + label + at);
      next.setAttribute('aria-label', 'Next image, ' + label + at);
    };

    const go = (n) => {
      const clamped = Math.max(0, Math.min(total - 1, n));
      if (clamped === idx) return;
      idx = clamped;
      render();
    };

    prev.addEventListener('click', () => go(idx - 1));
    next.addEventListener('click', () => go(idx + 1));

    /* horizontal swipe, since this only ever renders on a touch-shaped
       viewport. Deliberately NOT pointer-capture based — see the note on the
       float above; a plain threshold on pointerup is enough here and cannot
       swallow the buttons' own clicks. */
    let x0 = null;
    frag.addEventListener('pointerdown', (e) => { x0 = e.clientX; }, { passive: true });
    frag.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });

    render();
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
      /* measures the whole document, so it must refresh LAST — after every pin
         above it has settled its spacer and stopped changing the height it is
         measuring against */
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3,
                       refreshPriority: 2 }
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

  /* These are created LAST but point at elements spanning the whole page,
     #hero and #stats included — i.e. above the #pillars pin that has already
     been built. refreshPriority puts them back in page order so a refresh
     (fonts.ready, plate-image load) recalculates the pin before the triggers
     that sit around it. */
  sheets.forEach((s, i) => {
    ScrollTrigger.create({
      trigger: s.el,
      start: 'top center',
      end: 'bottom center',
      refreshPriority: 1,
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
      refreshPriority: 1,
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
      refreshPriority: 1,
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
     already used globally by the hero's char-split effect (main.js,
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
   compete with the hero frame set for bandwidth on page load.

   150% was measured as the actual bug behind "the sticky plate looks
   frozen" and "previews only work for one row, randomly": #pillars (builder
   video, 7.2MB) and #work (closer video, 4.8MB) are one section apart, so a
   150%-viewport margin put both of their triggers inside the SAME
   intersection batch on ordinary scroll speed. Both v.load()s fired in the
   same tick — 12MB hitting the network/decoder together, right as the
   hero's own frame set (up to 37MB of AVIF/WebP) could still be mid-flight —
   and whichever finished last just sat on its placeholder looking stuck.
   Direct testing confirms both files decode in single-digit milliseconds
   once actually requested, so the fix is demand shaping, not the files
   themselves: a smaller lead margin plus an explicit stagger so two videos
   that intersect together never load together. */
let pendingBgLoads = 0;
const lazyVideoIo = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    lazyVideoIo.unobserve(en.target);
    const v = bgVideos.get(en.target);
    if (!v) return;
    const delay = pendingBgLoads * 400;
    pendingBgLoads++;
    setTimeout(() => { v.src = en.target.dataset.video; v.load(); }, delay);
  });
}, { rootMargin: '35% 0px' });
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
   The bar is a solid chip on this page too, so it would otherwise sit on
   top of body copy. Deliberately not a theme flip: that is what made the
   header vanish at section boundaries in lab/005.

   .sheetbar used to join this same listener on phones (it's display:none
   there now — the ≤1024px drawer nav owns that job, see style.css and the
   drawer IIFE above — so its half of this listener was removed rather than
   left toggling a class on a permanently-hidden element). */
(() => {
  const root = document.documentElement;
  const bar = document.querySelector('.brief-topbar');
  if (!bar || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let last = window.scrollY;
  addEventListener('scroll', () => {
    const y = window.scrollY;
    if (Math.abs(y - last) < 6) return;
    /* !menu-open: the drawer's own toggle button lives in this bar — it
       must never auto-hide out from under an open drawer */
    const hide = y > last && y > 220 && !root.classList.contains('menu-open');
    root.classList.toggle('bar-hidden', hide);
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
