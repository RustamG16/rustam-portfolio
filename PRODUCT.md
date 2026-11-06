# Product

<!-- impeccable:product-schema 1 -->

The durable product contract for the RG × Convenium portfolio, built from `../prd.md`, `../.olympus/BRAND.md`,
`../.olympus/PLAN.md` and the copy tree in `src/content/copy.en.json` (identical key tree in `copy.de.json`;
until phase 6 copies them, the files live in `../.olympus/copy/`). Every visible string comes from a copy key
named below. No string is typed into a component. Visual numbers live in `DESIGN.md`.

> impeccable's `init` interview was replaced by the PRD. Russ answered every product question in PLAN.md
> and prd.md on 2026-11-06, and phase 1 recorded them. Nothing here is newly decided product truth.

## Platform

web: a static site, desktop and phone equally. The phone is a primary experience, not a fallback.

## Stack

- **Astro 5, static output.** It produces HTML per route and language with no runtime, and matches the
  lab/003 precedent.
- **GSAP 3.15** (core, ScrollTrigger, SplitText). It drives exactly the three budgeted effects.
- **Lenis 1.3.** It smooths wheel input into the scrub, on fine pointers only.
- **Self-hosted woff2 fonts.** The legal page promises no third-party requests.
- **One classic IIFE script bundle (esbuild).** It is the only shape that runs from `file://`, which is
  how Russ opens builds.

Details: `architecture.md`.

## Users

1. **Hiring managers and tech leads** at agencies and startups in Austria and the EU. They decide whether
   to interview, and give it under a minute, usually on a laptop between other applications, sometimes
   on a phone from a LinkedIn link. They verify on `/cv/`, then download the CV or get in touch.
2. **SME owners in Austria and the EU** who need a website, brand or AI automation. They decide whether
   this person can do theirs, usually on a phone. They look for their own sector in the works index and
   for one accountable person.

## Product Purpose

The site proves, in under a minute, that one person ships the whole pipeline: engineering, AI
orchestration, design and film. Success is observable:
- a "Get in touch" click (mailto, LinkedIn, Instagram or WhatsApp);
- a "Download CV" click;
- a work row opened to its live site;
- an independent finish review ≥ 85 with no Critical finding.

## Positioning

One person, whole pipeline. It reads as a personnel file inside the Convenium studio family: exact,
few words, the numbers do the talking.

## Operating Context

- **Desktop targets:** 1920×1080, 1440×900, 1024×768.
- **Phone targets:** 390×844, 360×780, 430×932.
- **Throttled phone profile:** INP < 200 ms, LCP ≤ 2.5 s.
- **Hosting:** GitHub Pages at `https://rustamg16.github.io/rustam-portfolio/`, repository
  `RustamG16/rustam-portfolio`, branch `main`.
- **Opens from disk:** the `file://` build must work fully. No `fetch`, no module scripts, no
  root-relative URLs.
- **No cookies, analytics or tracking.** The language lives in the URL (`/de/`); nothing is written to
  storage.

## Capabilities and Constraints

### Routes

| Route | Lang | Purpose | Primary action | Secondary |
|---|---|---|---|---|
| `/` | en | Home: film, then the evidence | Get in touch (`contact.cta`) | Download CV (`contact.cv`) |
| `/de/` | de | Home | Kontakt aufnehmen | CV herunterladen |
| `/cv/` | en | CV + five-document vault | Get in touch (`cv.end.cta`) | Download CV (`cv.download`) |
| `/de/cv/` | de | CV | (same keys) | (same keys) |
| `/legal/` | en chrome, de body | Offenlegung & Datenschutz, verbatim | — | — |
| `/de/legal/` | de | Same content | — | — |
| `/404.html` | en + de | Not in the index | Back to the start (absolute URL) | — |
| `/cv.html`, `/legal.html` | — | Legacy redirects to `cv/` and `legal/`, keeping the hash (`#vault`, `#doc-knime`, …) | — | — |

Old in-page anchors keep working: home `#work`, `/cv/#vault`, `/cv/#doc-<id>`.

### Home: sections in order, with copy keys

Shared chrome on every page:
- **Header:** `nav.homeAria`, `nav.mark`, `nav.work|about|cv|contact`, `nav.lang.*`, `nav.primaryAria`, plus
  the header CTA `contact.cta`.
- **Skip link:** `nav.skip`.
- **Phone tab bar:** `nav.tabBarAria`, `nav.work|about|cv|contact`.

| # | Section (id) | Copy keys, in reading order | Notes |
|---|---|---|---|
| 1 | Loader | `loader.mark` (drawn as the RG mark, text sr-only), `loader.line`, `loader.aria` | ≤ 0.9 s; not shown under reduced motion or on internal navigation |
| 2 | Hero `#top` | `hero.h1Aria` (H1 name), `hero.wordmark`, `hero.titleCard.line1`, `.line2`, `.line3`, `hero.kicker`, `hero.frame.label` + counter + `hero.frame.sep`, `hero.scrollHint`, `hero.enter` + sr-only `hero.skipFilm`, `hero.roles` (sr-only, after re-entry), `hero.posterAlt` (reduced-motion still) | Beat sheet in DESIGN.md `hero.beats` |
| 3 | Works `#work` | `works.kicker`, `works.location`, `works.title` (H2), `works.intro`, then for each id in `works.order` (`convenium, meridian, sonnwerk, wild-gruppe, savra, doko`): `works.items.<id>.index`, `.name`, `.sector` (split on " · " into sector + state label), `.line`, `.tags`, `.href`, `.alt`; `works.cta`, `works.cursor`, `works.newTab`, `works.filmLabel` | Rows link out in a new tab |
| 4 | Statement `#summary` | `statement.kicker`, `statement.line` (italic), `statement.body`, `statement.stats.{years,projects,languages,pipeline}.{value,suffix,label}`; aside: `cv.cover.portraitAlt` (P4 portrait), `statement.status.key` + `.value`, `statement.status.location`, `nav.downloadCv` | Figures are locked facts |
| 5 | Capability `#about` | `capability.kicker`, `capability.title` (H2), `capability.pillars.{engineer,orchestrate,design}.{index,title,body,portraitAlt}`, `capability.also.label`, `capability.also.items` | The tab bar's "About" lands here |
| 6 | Experience `#experience` | `experience.kicker`, `experience.title` (H2), `experience.lede`, per id in `experience.order`: `experience.roles.<id>.{years,duration,role,employer,city}`; `experience.award`, `experience.cta` (→ `/cv/`), `experience.cvPdf` | |
| 7 | Contact `#contact` | `contact.kicker`, `contact.headline[0..1]` (H2, two lines), `contact.body`, `contact.cta` (mailto), `contact.cv` (PDF), `contact.status`, `contact.channels.{email,linkedin,instagram,whatsapp}.{label,value,href}` + `whatsapp.aria` | No form |
| 8 | Footer | `footer.links.{work,cv,documents,legal}`, `footer.copy`, `footer.location`, `footer.backToTop`, `footer.wordmark` (aria-hidden SVG; real text elsewhere) | |

Meta: `meta.home.{title,description,ogTitle,ogDescription,ogImageAlt}`, `meta.siteName`, `meta.ogLocale`,
`meta.ogLocaleAlternate`, `_meta.htmlLang`.

### CV `/cv/`: sections in order

| # | Section (id) | Copy keys |
|---|---|---|
| 0 | Chrome | `cv.skip`, `cv.back`, `cv.download`, `cv.downloadShort`, `cv.spine.aria`, `cv.spine.end` |
| 1 | Cover `#top` | `cv.cover.kicker`, `cv.cover.name[0..1]` (H1, `cv.cover.nameAria`), `cv.cover.roles` (`cv.cover.rolesAria`), `cv.cover.meta.{subject,origin,station,period,contents}.{label,value}`, `cv.cover.docsLink` (→ `#vault`), `cv.cover.hint`, `cv.cover.portraitAlt` |
| 2 | 01 Vitals `#vitals` | `cv.vitals.num`, `.title`, `.stats.{years,projects,languages,pipeline}.*`, `.status.key|value` |
| 3 | 02 Experience `#experience` | `cv.experience.num`, `.title`, per id in `.order`: `.roles.<id>.{from,to,duration,role,employer,city,bullets,tags}`, `infineon.award.{label,link}` (→ `#doc-knime`), `cv.techAria` |
| 4 | 03 Education `#education` | `cv.education.num`, `.title`, `.degrees.{master,bachelor}.{years,title,institution,city}` |
| 5 | 04 Capabilities `#capabilities` | `cv.capabilities.num`, `.title`, `.selfDirected`, `.groups.{eng,design,ai,mkt}.{index,title,rows}` |
| 6 | 05 Languages `#languages` | `cv.languages.num`, `.title`, per id in `.order`: `.items.<id>.{name,native,level}` |
| 7 | 06 Documents `#vault` | `cv.documents.num`, `.title`, `.intro`, `.hint`, per id in `.order` (`knime, iba, bach, ref1, ref2`): `.items.<id>.{title,desc,meta}` with anchor `#doc-<id>`; `cv.openDoc`; lightbox `cv.documents.lightbox.{openPdf,close}` |
| 8 | End card `#end` | `cv.end.kicker`, `cv.end.headline[0..1]`, `cv.end.cta`, `cv.end.cv`, `cv.end.selectedWork` (→ `/#work`) |

Meta: `meta.cv.*`. Document PDFs, download names, page counts and scans come from `facts.json` → documents.

### Legal and 404

- **Legal:** `legal.title`, `legal.heading`, `legal.description`, `legal.back`, `legal.footerLabel`. On
  `/legal/` (EN chrome) `legal.notice` sits above the body. The body is the old `legal.html` main
  content, verbatim, in German, saved by phase 6 to `src/content/legal-body.de.html` before the old site
  is archived.
- **404:** `404.code` (H1), `404.line`, `404.back`, `meta.404.*`. Both languages are rendered. The DE
  block shows when the requested path contains `/de/`.

### States (every one is required)

| State | Behaviour |
|---|---|
| **Loading** | The loader curtain (≤ 0.9 s) lifts when frame 1 plus every 8th frame have decoded, or at 0.9 s, whichever comes first. Under it, the title card is already real HTML (it is the LCP). The canvas shows the nearest decoded frame. Before any frame lands it shows frame 1's colour field (noir). The old orbit poster is gone. |
| **Internal navigation** | Coming back to `/` from `/cv/` (same-origin referrer or `navigation.type === 'back_forward'`) skips the loader. Nothing is stored. |
| **Reduced motion** | No loader, Lenis, scrub or reveals. The hero is a 100svh still of frame 180 (phone frame 90) with the matte and wordmark in place, `hero.posterAlt` on the `<img>`. Works show posters on hover and focus, never films. The cursor is hidden. All content is visible on first paint. |
| **Touch / coarse pointer** | Native scroll (no Lenis), no cursor, no float preview. Works become the poster carousel. The tab bar shows below 960 px. Hover states also show on `:focus-visible`. |
| **Keyboard** | Skip link first. ENTER and every work row are reachable. Focusing a work row shows its poster in the float frame (desktop) and never autoplays a film. The lightbox traps focus and closes on Escape. |
| **DE** | Same routes under `/de/`, `<html lang="de">`, `hreflang` pairs in `<head>`. The toggle links to the same page in the other language and keeps the hash. German copy is written as German (phase 3). Both trees pass `check-copy.mjs`. |
| **No JS** | Every section and link renders. The hero shows the reduced-motion still. The loader never appears. Works rows are plain links. |
| **`file://`** | The `dist-file/` build: relative URLs, `index.html` appended to directory links, one classic script. All frames load through `<img>` events. |
| **Film missing** | If a work's `film.mp4` errors, the poster stays and the row still links. A missing frame falls back to the nearest decoded frame within 8. |

### Truth labels (on screen, both languages, never promoted)

| Work | EN `sector` | DE `sector` | State shown |
|---|---|---|---|
| 01 Convenium | Studio · live | Studio · live | live: the studio Rustam co-founded |
| 02 The Meridian | Hospitality · concept build | Hospitality · Konzept | concept build / Konzept |
| 03 Sonnwerk | Brand · concept build | Brand · Konzept | concept build / Konzept |
| 04 Wild Gruppe | Optomechatronics · concept | Optomechatronik · Konzept | concept / Konzept (unsolicited, stated in the line) |
| 05 Savra | Restaurant · concept build | Gastronomie · Konzept | concept build / Konzept |
| 06 DOKO | Barbershop · proposal | Barbershop · Vorschlag | proposal / Vorschlag |

"Commissioned", "client", "passionate" and "solutions" appear nowhere, and `check-copy.mjs` fails on them.
The state label is never hidden at any breakpoint.

### Facts that must not be invented

Only what is in `facts.json`. That means no new numbers, employers, awards, clients, testimonials, metrics
or outcome claims. The 10+ / 20+ / 5 / 1 stats, all four roles with dates and durations, both degrees, five
languages, five documents with their sizes, the CV PDF (`Rustam-Gurbanov-CV.pdf`) and four contact
channels are locked. Alt texts for not-yet-generated images are provisional until phase 8 checks them.

### Required guarantees

- **Accessibility:** WCAG 2.1 AA, Lighthouse accessibility 100 on home and CV, touch targets ≥ 44 px,
  the 12 px text floor, and visible focus everywhere.
- **Motion:** the effect budget is 3, and reduced motion is honoured as above. No reveal removes content
  from the accessibility tree.
- **Performance:** Lighthouse performance ≥ 90 (home, CV), INP < 200 ms, CLS ≤ 0.02, hero frames ≤ 12 MB
  desktop and ≤ 3.5 MB phone.
- **Phone:** the home page is ≤ 16 screens at 390×844 (planned 12.1) and safe areas are respected.
- **The hero contract** (numbers from DESIGN.md `hero`):
  - **Runway:** 320svh desktop, 300svh phone.
  - **Frames:** 180 at 1920×1080 desktop, 90 at 720×1280 phone. Baseline JPEG, ≤ 12 MB / ≤ 3.5 MB.
  - **Beats:** title 0–0.14, film 0.14–0.86, arrival hold 0.86–0.92, slide-out 0.92–1.00.
  - **Frame 180 is KD**, Rustam with the wordmark behind him.
  - **One unbroken take,** with scene-detect returning 0 on every clip.

## Brand Commitments

- **The subject is real.** Rustam Gurbanov, Klagenfurt am Wörthersee. All facts are his and locked.
- **The Convenium family:** tokens verbatim (noir / cotton / cherry, Archivo / Newsreader / Inter, no
  gradients or glass).
- **The portfolio's own mark** is the 12-bar vertical RG density ramp. The Convenium logo appears only
  as works row 01 and on its poster.
- **Imagery:** Rustam in the burgundy ribbed quarter-zip, white shirt, navy tie and black trousers,
  every time (Higgsfield element `cdb40bfb-dc88-4742-9419-18a752e3263b`). Work media is real capture of
  the live sites.
- **The hero is "The Descent"** from a real Wörthersee plate. Its licence or ownership is recorded in
  `../assets-in/descent/PROVENANCE.md`.
- **The direction is fixed:** board B + board C + SB-01. No alternatives are reopened.
