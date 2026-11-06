# Architecture essentials (derived from `architecture.md`, never edited on its own)

- **Stack:**
  - Astro `^5` static output, GSAP `3.15.0` (ScrollTrigger, SplitText) and Lenis `~1.3.0`.
  - esbuild bundles all client JS into **one classic IIFE** at `public/js/site.js`. Node 22.
  - No framework islands, no WebGL, no runtime dependency beyond these.
- **Config:**
  - `site: https://rustamg16.github.io` and `base: /rustam-portfolio`, the same for dev and Pages.
  - `FILE_BUILD=1` switches to base `/` and outputs to `dist-file/`.
  - `trailingSlash: 'always'`, `build.format: 'directory'`.
- **Routes:** `/`, `/cv/`, `/legal/`, `/de/`, `/de/cv/`, `/de/legal/`, and `/404.html` (bilingual,
  absolute back links). The legacy `cv.html` and `legal.html` redirect with the hash kept.
- **Content:**
  - `src/content/copy.{en,de}.json` + `facts.json` are the source of truth after phase 6 copies them.
  - `legal-body.de.html` holds the legal body verbatim.
  - Every visible string is a copy key (`PRODUCT.md`).
- **Tokens:** DESIGN.md front-matter (normative) → `src/styles/tokens.css` → `design.json` (generated).
- **Components:**
  - `components/chrome/*` (Header, LangToggle, TabBar, Footer, Mark, Cursor, SkipLink) and
    `components/ui/*` (Pill, EditorialLink, Wordmark).
  - `components/hero/*`, `components/home/*` (one per section), `components/cv/*`.
  - `views/*` hold the page bodies. `pages/*` are frozen 3-line wrappers.
- **Scripts:**
  - `main.ts` (frozen) runs env → lenis → header → cursor → page modules guarded by `data-*` hooks.
  - Every ticker callback is wrapped in try/catch.
  - `refreshPriority` follows page order.
- **Hero:**
  - Runway 320svh (phone 300svh); `FlipbookScrubber.ts` is a hold-everything loader.
  - Frames: `public/frames/hero/desktop/frame_0001..0180.jpg` (1920×1080) and
    `phone/frame_0001..0090.jpg` (720×1280), plus `matte.webp` in each.
  - Loading:
    - coarse-first preload (every 8th frame);
    - baseline JPEG, never AVIF, never windowed;
    - element events, never `fetch`.
  - The playhead comes from the scrubbed proxy `p` (`scrub: 1`), never `ScrollTrigger.progress`.
  - The matte shows only when `p ≥ 0.86` and the painted frame is the last one.
- **Lenis** runs on wheel input with fine pointers only (`syncTouch: false`), exposed as `window.__lenis`.
  Touch keeps native scroll.
- **`file://`:**
  - classic script only;
  - `withBase()` for every internal URL;
  - `<html data-base>` for script-built URLs;
  - `scripts/relativize.mjs` rewrites `dist-file/`.
- **Media:**
  - Works: `public/works/<slug>/{film.mp4,poster.jpg}` × 6, 960×1200, ≤ 4 MB, `preload="none"`.
  - Portraits: `public/media/portraits/`.
  - OG: `public/og/{home,cv}.jpg`.
  - Kept PDFs and scans stay at their old paths.
- **Gates** (`npm run check`):
  - `check-copy`
  - `check-tokens`
  - `build`
  - `ci/check-refs.mjs dist`
  - `check-frames`
  - `check-facts-dist`
- **QA:** `qa/*.mjs` with puppeteer-core and system Chrome. Covers capture at 1440 / 1024 / 390, scrub
  sweep, reduced motion, `file://` and real clicks (with Lenis parked first).
- **Deploy:** `.github/workflows/deploy.yml` builds and runs every gate, uploads `dist/`, then runs
  `deploy-pages`. It runs only after Gate C, on Russ's word.
