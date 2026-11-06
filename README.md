# Rustam Gurbanov portfolio (RG × Convenium)

Astro 5 static site, GSAP 3.15 + Lenis 1.3 bundled into one classic script so builds open from `file://`.
Live: https://rustamg16.github.io/rustam-portfolio/ · repo `RustamG16/rustam-portfolio`, branch `main`.

How an agent works here: `CLAUDE.md` (and `AGENTS.md`, a pointer). Numbers: `DESIGN.md`. Product contract:
`PRODUCT.md`. Tech: `architecture.md` (one-screen outline: `architecture-essentials.md`).

```bash
npm ci                      # Node 22
npm run dev                 # astro dev + esbuild --watch  ->  http://localhost:4180/rustam-portfolio/
npm run build               # esbuild IIFE (public/js/site.js) + astro build  ->  dist/
npm run build:file          # file build + scripts/relativize.mjs  ->  dist-file/  (double-click index.html)
npm run serve               # dist/ mounted under /rustam-portfolio/ on http://127.0.0.1:4181/rustam-portfolio/
npm run check               # every gate (check-frames stays red until the hero frames are delivered)
node scripts/check-all.mjs --allow-frames   # the same, minus the frame gate
npm run tokens              # regenerate src/styles/tokens.css from the DESIGN.md front-matter
node qa/capture.mjs | qa/chrome.mjs | qa/file-url.mjs   # QA scenarios (system Chrome, CHROME_PATH)
```

Before publishing, review every PDF in `public/assets/`: GitHub Pages is public and each committed document is
downloadable. A deploy (push to `main`) happens only after Gate C and on Russ's word. The retired vanilla site
lives in `../_attic/brief-rg-2026/`.
