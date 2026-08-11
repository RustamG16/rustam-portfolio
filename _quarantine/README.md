# Quarantine

Dead files, moved out of the shipping tree during the 2026-08-09 homepage fix
pass. Nothing here is linked from any live page.

- `index-v2.html`, `main-v2.js`, `style-v2.css`, `cursor-v2.js`, `cv-v2.html`,
  `cv-v2.css`, `cv-v2.js`, `nojs-test-v2.html` — a superseded redesign draft
  (version tags `proof-1`/`proof-2`). Never committed prior to this move, not
  referenced by `index.html`, `cv.html`, `_headers`, or anything else in the
  live set. See `PROMPT-redesign-v2.md` at the repo root for the brief that
  produced it, if it's ever worth reviving.
- `media/work/previews/meridian-hero.mp4` — an unused 1MB clip. Zero
  references anywhere in `*.html`/`*.js`/`*.css`. `meridian.mp4` (the one
  actually wired to the Meridian row's hover preview) is unaffected.

Safe to delete outright once confirmed unneeded; kept here instead of
deleted so the move is reversible.
