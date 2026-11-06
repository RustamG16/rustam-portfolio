# RG × Convenium portfolio: how an agent works here

This folder is Rustam Gurbanov's (Russ's) portfolio and its own git repo: `RustamG16/rustam-portfolio`,
branch `main`, served at https://rustamg16.github.io/rustam-portfolio/. It is being rebuilt as an Astro
site in the Convenium family. `AGENTS.md` points here, and only one copy of these rules exists.

## Read first, in this order

1. `../.olympus/00-run-plan.md`: your phase, model, report path and the session rules.
2. `../.olympus/06-build-plan.md`: the design, phase by phase, and **which files you own**.
3. `architecture-essentials.md`, then `architecture.md` only for the section you need.
4. `DESIGN.md`: the only source of visual values. The front-matter is normative.
5. `PRODUCT.md`: routes, sections in order, copy keys, states and truth labels.

`../.olympus/PLAN.md` is the intent of record. **Never read `../_attic/`.** Archives are poison.

## Commands

```bash
npm ci                     # install (Node 22)
npm run dev                # astro dev + esbuild --watch → http://localhost:4321/rustam-portfolio/
npm run build              # build-client (esbuild IIFE) + astro build → dist/
npm run build:file         # FILE_BUILD=1 astro build → dist-file/ + scripts/relativize.mjs (opens from disk)
npm run check              # every gate: check-copy, check-tokens, build, check-refs dist, check-frames, check-facts-dist
node scripts/check-copy.mjs        # facts, key parity, truth labels, banned words (EN + DE)
node ci/check-refs.mjs dist        # every local reference in the build exists
node scripts/check-tokens.mjs      # colour, gradient, breakpoint, fetch, module-script and base-URL discipline
node scripts/check-frames.mjs      # 180 + 90 frames, sizes, baseline JPEG, byte budgets, mattes
node scripts/check-facts-dist.mjs  # facts visible on each built route, EN + DE
node scripts/gen-design-json.mjs   # regenerate design.json after a DESIGN.md amendment
node qa/capture.mjs | qa/scrub-sweep.mjs | qa/reduced.mjs | qa/file-url.mjs | qa/real-clicks.mjs
```

The QA scripts drive the installed Chrome (`CHROME_PATH`, default
`C:/Program Files/Google/Chrome/Application/chrome.exe`). The browser pane can't open `file://`; use
`qa/file-url.mjs` for that.

## Conventions

- **Copy:** every visible string comes from `src/content/copy.{en,de}.json`, read through `t(lang)`. Never
  type a string into a component. Facts live in `src/content/facts.json` and are locked. A copy change
  must pass `check-copy.mjs` in both languages.
- **Truth labels:** each work's state (live / concept build / concept / proposal; DE Konzept / Vorschlag)
  shows on screen at every breakpoint. "Commissioned", "client", "passionate" and "solutions" never
  appear.
- **URLs:** every internal URL goes through `withBase()`. Scripts build media URLs from
  `document.documentElement.dataset.base`. Never write `href="/…"` or `src="/…"`.
- **Scripts:** client code lives only in `src/scripts/**`, bundled to one classic IIFE. No processed
  `<script>` in components, no `type="module"`, no `fetch()`, no framework islands.
  - Every `gsap.ticker` callback body sits in try/catch.
  - `scrub: 1` goes on a tween, never on a bare `ScrollTrigger.create`.
- **Tokens:** values come from `src/styles/tokens.css`, which mirrors DESIGN.md. Breakpoints are
  literals 640 / 960 / 1200 only.
  - The colours are the Convenium palette only.
  - The red roles are fixed: cherry selects, maroon deepens, chili signals, chili-300 is red text on
    noir. Never noir text on red. The focus ring is chili.
- **Motion:** the effect budget is 3, and adding a fourth is a defect:
  1. the hero scrub;
  2. the masked-line reveal, including the yBlock media rise;
  3. the works float preview.

  Reveals move opacity and transform only, never `autoAlpha`, `visibility` or `display`. Reduced motion
  gets the static end state in DESIGN.md § Motion.
- **Frames:** baseline JPEG, never AVIF, never progressive. Hold every frame; never window, evict or
  fetch them. Desktop is 180 at 1920×1080, phone 90 at 720×1280.
- **One-continuous-video law:** no cut or dissolve inside a hero clip. Joins are frame-locked (clip N's
  last frame = clip N+1's first frame).
- **Commit to one direction.** Never hand Russ two options. Pick one, do it, and list rejected
  alternatives in one line each in your report.
- **Testing clicks:** use real dispatched clicks, never `el.click()`. Park Lenis first with
  `__lenis.scrollTo(y, { immediate: true })`.

## File ownership

Writers never share files. The table in `../.olympus/06-build-plan.md` § "File ownership" is binding.
Touch only your phase's files. If you need a change in someone else's file, say so in your report;
don't edit it. These files are frozen after phase 6 and change only through a DESIGN.md amendment
approved at a gate:
- `src/pages/**`
- `src/scripts/main.ts`
- `src/styles/tokens.css`
- `astro.config.mjs`

## Never touch

- `../_attic/**`: never read, never write.
- `DESIGN.md`, `PRODUCT.md`, `design.json`, `architecture*.md`, `CLAUDE.md`, `AGENTS.md`. These change only
  through a phase-2 style amendment that Russ approves at a gate. If one is wrong, report it.
- `src/content/facts.json` values, the five document PDFs and scans, the CV PDF and its download name
  `Rustam-Gurbanov-CV.pdf`.
- `src/content/legal-body.de.html` text (legal wording is Russ's).
- `.github/workflows/deploy.yml` after phase 6, unless a gate script changes.
- **Git:** commit nothing, switch no branch, push nothing, unless the brief says so. **A deploy (push
  to `main`) happens only after Gate C and on Russ's word.**

## Gates (Russ decides; no agent self-scores)

| Gate | What Russ approves | Evidence |
|---|---|---|
| B | DESIGN.md + PRODUCT.md as numbers + `06-build-plan.md` | `../.olympus/relay/02-design.report.md` |
| 1 | Hero keyframes KA, KB, KP, KC, KD | stills in `../assets-in/descent/keyframes/` |
| 2 | Hero clips V1–V4 | 2 fps contact sheets + `ffprobe select=gt(scene,0.3)` returning 0 per take |
| C | Finish review ≥ 85, no Critical | `../.olympus/10-finish-review.md` |

A phase ends with its report in `../.olympus/relay/`. The report ends with `DONE:` and the changed
paths, or `BLOCKED:` and one question with your proposed answer first. Two failed attempts at the same
thing means stop and report.

## The credit rule (Higgsfield)

- **Cap: 180 credits** for the whole project. **6 are already spent**, so 174 remain.
- **Before every paid call:**
  - preflight the cost (`get_cost: true` or the model's cost tool);
  - show Russ the number and the input stills;
  - wait for an explicit **yes in chat, at the moment of spending**.
- **A plan approval is not that yes.**
- After each call, add the spend to the running total in `../.olympus/05-asset-manifest.md`.
- A call that would push the total past 180 does not happen; report `BLOCKED:` instead.
- Retakes count. Failed generations count.
- Never pass credentials into a page or prompt.
