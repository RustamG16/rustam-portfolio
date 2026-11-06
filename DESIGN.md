---
# ============================================================================================
# RG x Convenium portfolio. The token block, committed as numbers before any layout code
# (Convenium.Design design-system rule). Phase 2, 2026-11-06. Gate B.
# Normative: every number here wins over prose, over 02-direction.md and over any component.
# A change to a value is a DESIGN.md amendment first, then src/styles/tokens.css, then code.
# Convenium values are copied verbatim from D:\Projects\Convenium\styles\tokens.css + DESIGN.md
# + components/motion/motion.ts. Portfolio-only additions are marked "portfolio".
# design.json in this folder is the machine form of this block, generated from it.
# ============================================================================================
name: "RG x Convenium: Rustam Gurbanov portfolio"
description: "A warm noir stage where one drone take descends onto Rustam, then a ruled cotton index sheet slides over it carrying the evidence."
northStar: "Noir Portal → Index Sheet"
doctrine:
  hero: "convenium-design-kinetic"
  pages: "convenium-design-instrument (structure only: ruled rows, tabular figures, visible grouping)"
  family: "Convenium Studio (tokens verbatim)"

colors:
  noir: "#1b1717"            # ambient ground: hero, contact close, footer, CV cover, chrome
  cotton: "#edebdd"          # the sheet; text on noir, cherry and maroon
  paper: "#f5f3e8"           # lifted light surface: document cards, lightbox plate
  ink: "#241f1f"             # reading text on cotton/paper
  gray: "#6e6963"            # secondary text on cotton/paper
  gray-on-noir: "#a8a29a"    # secondary text on noir
  hairline: "#d6d2c2"        # rules and dividers on cotton
  cherry: "#810100"          # SELECTS: active/hovered row, CTA pill, links on cotton, the one bar of the RG mark
  maroon: "#630000"          # DEEPENS: hover fill of cherry controls only; never text
  chili: "#d73b3e"           # SIGNALS: hero progress rule, focus ring, live dot, marks >= 24px on noir
  chili-300: "#e5595c"       # body-size red text on noir
  wordmark: "#2a2424"        # footer GURBANOV. on noir (texture, aria-hidden)
  rule-on-noir: "rgba(237, 235, 221, 0.18)"   # 1px rules on noir (Convenium precedent: cotton 18 %)
  scrim-type: "rgba(27, 23, 23, 0.65)"        # portfolio: belongs to the type, only behind hero chrome text if a frame is bright

typography:
  hero:
    role: "GURBANOV wordmark, the home H1 (title card + re-entry). SVG-fitted."
    fontFamily: "Archivo (variable), 'Arial Narrow', Arial, sans-serif"
    fontVariationSettings: "\"wght\" 900, \"wdth\" 100"
    token: "--display-hero: clamp(72px, 16vw, 300px)"
    fontSize: "min(var(--display-hero), (100cqi) / 6.264)"
    renderedAt: { w1920: "293.7px = 15.30vw", w1440: "217.1px = 15.08vw", w1024: "153.7px = 15.01vw", w390: "57.2px = 14.65vw", w360: "52.4px = 14.55vw", w2560: "300px = 11.72vw (cap)" }
    fontWeight: 900
    lineHeight: 0.72
    letterSpacing: "-0.02em"
    textTransform: "uppercase"
    advanceEm: 6.264        # measured, Archivo latin wght woff2, 900, -0.02em, Chrome 151, 2026-11-06
    inkWidthEm: 6.240
    capHeightEm: 0.703
    svg: "viewBox='0 -704 6264 720'; <text x='0' y='0' font-size='1000' letter-spacing='-20' textLength='6264' lengthAdjust='spacing'>; width 100% of container; max-width 1879px"
    kineticCheck: "doctrine --display-max 12-18vw; rendered 14.55-15.30vw from 360 to 1920 px; PASS. Above 2500 px the PLAN cap (300px) holds and it drops to 11.7vw at 2560: accepted."
  footer-wordmark:
    role: "GURBANOV. edge to edge in the footer, colour wordmark, aria-hidden"
    fontFamily: "Archivo (variable)"
    fontWeight: 900
    advanceEm: 6.457
    svg: "viewBox='0 -704 6457 720'; textLength='6457'; width 100% of container"
    letterSpacing: "-0.02em"
  h1:
    role: "page H1 on /cv/ (name), /legal/, 404 code"
    fontFamily: "Archivo (variable)"
    fontSize: "clamp(2.5rem, 1.56rem + 3.85vw, 5rem)"      # 40 -> 80 (Convenium H1 range)
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    textTransform: "uppercase"
  display:
    role: "section heads (capability, experience, contact, CV sections)"
    fontFamily: "Archivo (variable)"
    fontSize: "clamp(2rem, 1.1rem + 2.8vw, 4rem)"          # 32 -> 64, Convenium --font-display
    fontWeight: 900
    lineHeight: 1.02
    letterSpacing: "-0.02em"
    textTransform: "uppercase"
  list:
    role: "work names in the index rows; mobile card names"
    fontFamily: "Archivo (variable)"
    fontSize: "clamp(1.75rem, 1.13rem + 2.54vw, 3.25rem)"  # 28 -> 52, Convenium --font-list
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.01em"
    textTransform: "uppercase"
  figure:
    role: "stat figures (10+, 20+, 5, 1), work indices 01-06; capped at 56px (Rank Rule)"
    fontFamily: "Archivo (variable)"
    fontSize: "clamp(2.5rem, 2.13rem + 1.52vw, 3.5rem)"    # 40 -> 56 (portfolio)
    fontWeight: 900
    lineHeight: 1
    fontFeatureSettings: "\"tnum\" 1"
  index-sector:
    role: "sector word in a work row (board C), e.g. HOSPITALITY"
    fontFamily: "Archivo (variable)"
    fontSize: "clamp(1.25rem, 0.9rem + 0.9vw, 2rem)"       # 20 -> 32 (subhead numbers, Archivo face)
    fontWeight: 900
    lineHeight: 1.05
    textTransform: "uppercase"
  card-title:
    role: "statement line (italic), pillar titles, CV role titles, card titles"
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.5rem, 1.1rem + 1vw, 2.25rem)"       # 24 -> 36
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  subhead:
    role: "title-card roles line (italic), ledes, contact body"
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.25rem, 0.9rem + 0.9vw, 2rem)"       # 20 -> 32
    fontWeight: 400
    lineHeight: 1.3
  body:
    role: "long-form serif: CV bullets, statement body"
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1rem, 0.9rem + 0.35vw, 1.25rem)"      # 16 -> 20
    fontWeight: 400
    lineHeight: 1.4
  small:
    role: "compact explanatory copy: work lines, pillar bodies, document descriptions"
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(0.875rem, 0.83rem + 0.15vw, 1rem)"    # 14 -> 16
    fontWeight: 400
    lineHeight: 1.55
  label:
    role: "labels, meta, state labels, frame counter, tags, buttons; the mono role of the boards"
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(0.75rem, 0.66rem + 0.12vw, 0.8125rem)" # 12 -> 13; 12px is the text floor
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.06em"                                  # --tracking-meta
    textTransform: "uppercase"
    fontFeatureSettings: "\"tnum\" 1"
  nav:
    role: "header nav items, tab-bar labels"
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.08em"                                  # --tracking-label
    textTransform: "uppercase"

fonts:
  files: "self-hosted woff2 in public/fonts/; no Google Fonts, no CDN (legal page promise)"
  archivo: { file: "archivo-latin-wght-normal.woff2 + archivo-latin-ext-wght-normal.woff2", axes: "wght 100-900 (wdth 100 is the default instance)", display: "swap", preload: "latin only" }
  newsreader: { file: "newsreader-latin-{normal,italic}.woff2 + latin-ext", weights: "400 (opsz variable)", display: "swap" }
  inter: { file: "inter-latin-wght-normal.woff2 + latin-ext + cyrillic", weights: "400 500 600", display: "swap", note: "cyrillic subset is required for 'Русский' in /cv/ languages; latin-ext for 'Azərbaycan' and 'Türkçe'" }
  fallbackMetrics: "size-adjust fallbacks generated for Archivo->Arial Narrow and Inter->Arial to hold CLS < 0.02"

rounded:
  sheet: "0px"        # the cotton sheet and the hero stage are square (board C)
  control: "8px"
  media: "8px"
  card: "10px"
  pill: "999px"       # CTA pills, lang toggle, tab-bar active fill
  disc: "50%"         # ENTER disc, cursor disc, live dot

spacing:
  scale: { "1": "8px", "2": "16px", "3": "24px", "4": "40px", "5": "48px", "6": "80px", "7": "120px" }
  scalePhone: { "5": "32px", "6": "48px", "7": "72px" }      # max-width 639px, Convenium phone rhythm
  container: "clamp(1rem, 0.443rem + 2.286vw, 2.5rem)"        # 16 -> 40
  sheetInset: "16px"                                          # 8px below 640
  gutter: "clamp(20px, 2.5vw, 48px)"
  bandPad: "clamp(64px, 7.5vw, 144px)"                        # 40px below 640
  measure: { body: "62ch", lede: "46ch", small: "56ch", label: "32ch" }
  grid: { columns: 12, columnsTablet: 8, columnsPhone: 4, gap: "var(--gutter)" }
  header: { height: "72px", heightPhone: "56px" }
  tabBar: { height: "64px", plus: "env(safe-area-inset-bottom)" }
  touchTargetMin: "44px"
  rowMin: { workRow: "96px", roleRow: "72px", channelRow: "56px", docRow: "88px" }

motion:
  # Convenium motion.ts, verbatim
  enter: 0.62            # s, copy block or line entrance
  media: 0.78            # s, media masks
  exit: 0.24             # s, anything leaving
  ease: "expo.out"
  easeInOut: "power2.inOut"
  stagger: 0.07          # s between siblings
  yBlock: 24             # px block travel
  yBlockMobile: 14       # px block travel below 960
  yPercentLine: 110      # masked line travel, % of line height
  start: "top 85%"
  css-ease-out: "cubic-bezier(0.16, 1, 0.3, 1)"     # --ease-out-sharp, twin of expo.out
  css-ease-in-out: "cubic-bezier(0.645, 0.045, 0.355, 1)"  # CSS twin of power2.inOut
  # template keys
  micro: "180ms"         # --duration-nav-hover: row hover colour, cursor fade, link underline
  move: "320ms"          # --duration-reveal: cursor disc size, header theme flip
  scene: "780ms"         # = media: float-preview open, sheet edge
  active: "260ms"        # --duration-nav-active
  menu: "450ms"          # --duration-menu (lightbox open)
  scrub: 1               # ScrollTrigger scrub on a tween, never on a bare create, never 0
  floatLerp: 0.14        # portfolio: works float preview follows the pointer
  floatSize: "320x400px" # portfolio: 4:5, matches the 960x1200 works films
  loaderMax: "0.9s"
  effectBudget: ["hero scrub", "masked-line reveal (incl. yBlock media rise)", "works float preview"]

hero:
  runway: "320svh"                 # --runway-hero; pinned scroll while the 100svh stage is sticky
  runwayPhone: "300svh"            # --runway-hero-phone
  sectionHeight: "calc(100svh + var(--runway-hero))"
  beats: { titleHold: [0, 0.08], titleOut: [0.08, 0.14], film: [0.14, 0.86], arrivalHold: [0.86, 0.92], wordmarkIn: [0.86, 0.90], chromeOut: [0.86, 0.89], slideOut: [0.92, 1.0], enterOut: [0.92, 0.95] }
  keyframes: { KA: "frame 1, p 0.14", KB: "frame 45, p 0.32", KP: "frame 90, p 0.50", KC: "frame 135, p 0.68", KD: "frame 180, p 0.86" }
  hops: { V1_KA_KB: [0.14, 0.32], V2_KB_KP: [0.32, 0.50], V3_KP_KC: [0.50, 0.68], V4_KC_KD: [0.68, 0.86] }
  hopNote: "four 8 s hops = 45 frames each between five keyframes; KP (at the slit, portal threshold) is added because four hops need five keyframes; V4 ends on KD = frame 180"
  titleFilmOpacity: { at0: 0, at0_08: 0.35, at0_14: 1 }
  titleRise: "24px"
  sheetOverlap: { desktop: "-25.6svh", phone: "-24svh" }   # 0.08 x runway
  frames:
    desktop: { path: "frames/hero/desktop/frame_", ext: ".jpg", pad: 4, count: 180, w: 1920, h: 1080, format: "baseline JPEG (never progressive, never AVIF)", maxTotal: "12 MB", avgTarget: "66 KB" }
    phone: { path: "frames/hero/phone/frame_", ext: ".jpg", pad: 4, count: 90, w: 720, h: 1280, crop: "9:16 centre crop of the same concat", maxTotal: "3.5 MB", avgTarget: "39 KB" }
    poster: { desktop: "frames/hero/desktop/frame_0180.jpg", phone: "frames/hero/phone/frame_0090.jpg" }
    matte: { desktop: "frames/hero/desktop/matte.webp (1920x1080 RGBA, lossless)", phone: "frames/hero/phone/matte.webp (720x1280 RGBA, lossless)" }
    pick: "portrait orientation at load -> phone set, else desktop; never swapped mid-session"
    preload: "frame 1, then every 8th (indices 0,8,...,176 desktop / 0,8,...,88 phone), then the last frame, then the rest in index order; coarse set fetchPriority high"
    pxPerFrame: { at900tall: 11.6, at1080tall: 13.9, phone844: 20.5 }
  counter: "FRAME 001 / 180, zero-padded 3, from the painted index"
  enterDisc: "88px (72px phone), cotton fill, noir Inter 600 12px label"
  progressRule: "chili, 2px, full stage width at the bottom edge, scaleX 0->1 over the film beat"

mark:
  name: "RG density ramp (portfolio mark; Convenium's ramp turned to vertical bars)"
  viewBox: "0 0 100 100"
  orientation: "vertical bars, read left to right: hairline -> full weight"
  bars: 12
  ratio: 1.18
  gap: 4.01
  x: [0, 5.61, 11.51, 17.75, 24.39, 31.5, 39.17, 47.5, 56.6, 66.63, 77.73, 90.12]
  width: [1.6, 1.89, 2.23, 2.63, 3.1, 3.66, 4.32, 5.1, 6.01, 7.1, 8.37, 9.88]
  barHeight: 100
  fill: { onNoir: "cotton", onCotton: "ink" }
  accentIndex: 7          # the 8th bar, 0.618 of the way across, where the slit sits in KA
  accentFill: "cherry"
  sizes: { header: "32px", footer: "64px", loader: "96px", cvCover: "64px" }
  shapeRendering: "crispEdges at >= 64px, geometricPrecision below"
  below32px: "RAMP_MICRO turned vertical (3 bars, ratio 1.6, gap 6, x 0/27.27/63.64, widths 13.64/22.73/36.36), no accent bar; favicon only"
  loaderAnimation: "bars rise in left->right, scaleY 0->1 from the bottom, 34ms apart, 0.62s expo.out; no scan loop"
  lockup: "mark + 'RG — 2026' (nav.mark) in nav type, gap 12px"
  a11y: "aria-hidden; the accessible name is on the link (nav.homeAria)"

cursor:
  blend: "difference"
  color: "cotton"
  sizes: { default: "10px", link: "28px", view: "72px" }
  viewLabel: "works.cursor, Inter 600 12px uppercase 0.08em, noir"
  transitions: "opacity 180ms; width/height/margin 320ms cubic-bezier(0.16,1,0.3,1)"
  follow: "exact pointer position via transform in rAF (no lerp; the float preview is the lerped object)"
  zIndex: 100
  hiddenWhen: ["(hover: none)", "(pointer: coarse)", "(prefers-reduced-motion: reduce)"]

breakpoints:
  sm: "640px"
  md: "960px"
  lg: "1200px"
  queries: { desktopMotion: "(min-width: 960px) and (prefers-reduced-motion: no-preference)", mobileMotion: "(max-width: 959px) and (prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)", finePointer: "(hover: hover) and (pointer: fine)" }
  target: ["1920x1080", "1440x900", "1024x768", "390x844", "360x780", "430x932"]

budgets:
  heroFramesDesktop: "12 MB"
  heroFramesPhone: "3.5 MB"
  initialNonFrame: "600 KB (HTML + CSS + JS + fonts + poster)"
  js: "150 KB minified / 58 KB gzip (one IIFE bundle incl. GSAP core, ScrollTrigger, SplitText, Lenis; A1 2026-11-06 110/45→145/55; A2 2026-11-06 →150/58, measured 147/56.6 after phase 8)"
  css: "40 KB minified"
  fonts: "220 KB woff2 total, 2 preloaded"
  worksFilm: "4 MB each, preload none, fetched on first hover"
  worksPoster: "150 KB each (960x1200 JPEG)"
  portrait: "180 KB each (WebP)"
  lcp: { desktop: "2.0s", phoneThrottled: "2.5s" }
  inp: "200ms"
  cls: "0.02"
  lighthouse: { performance: 90, accessibility: 100 }
  homeScreensPhone: { ceiling: 16, planned: 12.1 }

components:
  header:
    height: "72px / 56px phone"
    onNoir: { text: "{colors.cotton}", ratio: "14.84:1" }
    onCotton: { background: "{colors.cotton}", text: "{colors.ink}", ratio: "13.58:1" }
    themeFlip: "ScrollTrigger per section at the header's centre line (start 'top 36px'), 320ms colour transition"
  nav-item:
    typography: "{typography.nav}"
    active: "1px underline, 6px offset, current colour"
    hit: "44px min height"
  lang-toggle:
    shape: "pill, 1px border current colour at 40 % (decorative), 36px tall, two Inter 600 12px segments EN|DE"
    active: "cherry fill, cotton text (9.05:1)"
  cta-pill:
    background: "{colors.cherry}"
    text: "{colors.cotton}"
    ratio: "9.05:1"
    typography: "Inter 600 13px uppercase 0.08em"
    height: "56px contact / 40px header"
    padding: "0 28px / 0 18px"
    hover: "{colors.maroon} fill, 180ms (11.45:1)"
  outline-pill:
    border: "1px current colour"
    text: "cotton on noir (14.84:1) / ink on cotton (13.58:1)"
    height: "56px"
    hover: "fill current colour, text flips to the ground"
  enter-disc:
    size: "88px / 72px phone"
    background: "{colors.cotton}"
    text: "{colors.noir}"
    ratio: "14.84:1"
    typography: "Inter 600 12px uppercase 0.08em"
  frame-counter:
    typography: "{typography.label}"
    text: "cotton on noir frames, with scrim-type behind the label when the frame under it is bright"
  progress-rule:
    color: "{colors.chili}"
    height: "2px"
  work-row:
    minHeight: "96px"
    columns: "index 1fr | name 5fr | dash 1fr | sector + state 5fr (12-col)"
    rule: "1px {colors.hairline} top and bottom"
    index: "{typography.figure} capped at list size, ink"
    name: "{typography.list}, ink"
    dash: "48 x 3px bar drawn in CSS, ink"
    sector: "{typography.index-sector}, ink"
    state: "{typography.label}, gray (4.54:1); 'live' in cherry (9.05:1) + 8px chili dot"
    hover: "index, name, dash, sector -> cherry (9.05:1) in 180ms; 12px cherry square marker at left; cursor 'view'"
  state-label:
    typography: "{typography.label}"
    color: "gray on cotton 4.54:1; gray-on-noir on noir 7.02:1"
  float-preview:
    size: "320 x 400px"
    radius: "{rounded.media}"
    open: "clip-path inset(100% 0 0 0) -> inset(0) 0.78s expo.out"
    close: "0.24s"
    content: "poster.jpg at once, film.mp4 muted loop playsinline once it can play"
  work-card-phone:
    width: "72vw (max 320px)"
    poster: "4:5, radius 8px"
    snap: "scroll-snap-type x mandatory; align start; gap 16px; scroll-padding = container"
  stat:
    figure: "{typography.figure}"
    label: "{typography.label}, gray"
    divider: "1px hairline vertical between stats at >= 960"
  statement-aside:
    background: "{colors.noir}"
    portrait: "4:5, full strength"
    status: "label, cotton"
    cta: "outline-pill 'Download CV'"
  pillar:
    index: "{typography.label}, cherry"
    title: "{typography.card-title}"
    body: "{typography.small}, ink, 56ch"
    portrait: "4:5 desktop / 4:3 phone, radius 8px"
  role-row:
    minHeight: "72px"
    years: "{typography.label} tnum"
    role: "{typography.card-title} at subhead size"
    employer: "{typography.small}"
  channel-row:
    minHeight: "56px"
    rule: "1px {colors.rule-on-noir}"
    text: "cotton (14.84:1); hover chili-300 (5.01:1)"
  editorial-link:
    color: "cherry on cotton (9.05:1); current colour on noir"
    underline: "1px, 6px offset, always visible"
  tab-bar:
    background: "{colors.noir}"
    item: "Inter 500 12px uppercase 0.08em, cotton, 64px tall, 25 % width each"
    active: "cherry pill fill (cotton 9.05:1) inset 8px"
    rule: "1px rule-on-noir top"
  doc-card:
    background: "{colors.paper}"
    text: "ink (14.62:1); meta gray (4.88:1)"
    radius: "{rounded.card}"
  lightbox:
    ground: "{colors.noir}"
    close: "44px square button, CSS-drawn cross, cotton"
    scroll: "data-lenis-prevent"
  focus-ring:
    color: "{colors.chili}"
    width: "2px"
    offset: "3px"
    ground: "--ring-ground per field (noir or cotton)"
    ratios: "chili on noir 3.88:1, chili on cotton 3.82:1 (both >= 3:1 non-text)"
  footer-wordmark:
    color: "{colors.wordmark}"
    ratio: "1.16:1 (texture, aria-hidden)"
---

# RG × Convenium: "Noir Portal → Index Sheet"

The front-matter is normative. This prose explains why each number is what it is, and where it may
be used. Direction: `../.olympus/02-direction.md`. Product truth: `PRODUCT.md`. Machine form:
`design.json`.

## Visual World

The ground is warm noir. On it, one filmed drone take falls from the blue-hour sky above Wörthersee
to a concrete studio with a single red slit, through a corridor and onto Rustam in a burgundy
quarter-zip. A cotton GURBANOV the width of the screen passes behind him. Then a square-cornered
cotton sheet slides up over the film and the page becomes a personnel file: ruled rows of six works
in Archivo capitals, one italic Newsreader line, tabular figures, and Inter metadata as quiet as a
stamp. Red appears as events only: the progress rule, a hovered row, the one bar in the mark, the
"Get in touch" pill. Someone shown ten portfolios would recognise this one by the slit-red line under
a black film and the ruled cream index that follows it.

**The One-Take Rule.** The hero is one continuous camera move. No cut, dissolve or crossfade happens
inside it, and every join is frame-locked before the frames are cut.

**The Sheet Rule.** Everything after the hero sits on one cotton sheet inset 16 px (8 px on phone) from
the noir page, with hairlines dividing the bands. Only the noir statement aside, portraits and the
two wordmarks run past a text column.

## Type

Three faces with three jobs, copied from Convenium's Three-Voice Rule:
- **Archivo** (variable, wght 900 / wdth 100) **decides**: the wordmark, H1s, section heads, work
  names, indices, sectors and figures. It is always uppercase and never under 20 px.
- **Newsreader explains**: one italic line per section, card and pillar titles, and CV body. It is
  never used for controls.
- **Inter operates**: nav, labels, buttons, the frame counter, state labels and the tab bar. It never
  sets a headline.

Inter at 12–13 px with 0.06em tracking and tabular numerals replaces the mono the boards drew. IBM
Plex Mono, Anton and Instrument Sans are retired.

**Hero size, and why it is that number.** PLAN commits `--display-hero: clamp(72px, 16vw, 300px)`, and
Kinetic's `--display-max` is 12–18vw.
- **The problem:** the board-B wordmark must run edge to edge, but "GURBANOV" measures **6.264 em** in
  Archivo 900 at −0.02em (Chrome, 2026-11-06). A literal 16vw would therefore be 100.2vw wide and
  overflow at every width.
- **The fix:** the committed rule is `min(--display-hero, container ÷ 6.264)`, drawn as an SVG with
  `textLength`, so the word fills its container exactly whatever the font metrics.
- **Rendered size:** **15.30vw at 1920, 15.08vw at 1440, 15.01vw at 1024 and 14.65vw at 390.** That is
  inside the doctrine at every target viewport.
- **Above 2500 px** the PLAN cap of 300 px holds and the word shrinks to 11.7vw at 2560. This is
  accepted: the cap stops a 4K screen from setting a 400 px word, and the sheet below is capped too.
- **Recorded in:** `../.olympus/run.json` → `design_system` by the director at Gate B.

**The Rank Rule.** From Convenium: within a page, a section head is never smaller than a numeral, a stat
figure or a label. That is why figures cap at 56 px and section heads reach 64 px. The only type above
a section head is the page H1 (the hero wordmark on home, the name on `/cv/`) and the footer wordmark.

**The Text-Zoom Note.** Every fluid size carries a rem term (WCAG 1.4.4). The hero wordmark is the one
vw-only size, because it is fitted to its container. Its accessible name is the H1's `aria-label`
(`hero.h1Aria`), and full-page zoom still scales it.

## Colour

Convenium verbatim. These are measured WCAG ratios, computed from the hex values on 2026-11-06.

**Legal pairings:**

| Foreground on ground | Ratio | Use |
|---|---|---|
| cotton on noir | 14.84:1 | all text on noir |
| gray-on-noir on noir | 7.02:1 | secondary text on noir |
| chili-300 on noir | 5.01:1 | body-size red text on noir, channel hover |
| chili on noir | 3.88:1 | graphics and ≥ 24 px display only: progress rule, focus ring, marks |
| ink on cotton | 13.58:1 | reading text on the sheet |
| ink on paper | 14.62:1 | document cards |
| gray on cotton | 4.54:1 | state labels, meta |
| gray on paper | 4.88:1 | document meta |
| cherry on cotton | 9.05:1 | links, hovered row, pillar index, "live" label |
| cherry on paper | 9.74:1 | links on paper |
| cotton on cherry | 9.05:1 | CTA pill, active tab, active lang segment |
| cotton on maroon | 11.45:1 | CTA pill hover |
| chili on cotton | 3.82:1 | focus ring on cotton, live dot (non-text) |

**Banned pairings** (measured, so nobody rediscovers them): noir on cherry 1.64:1 · cherry on noir
1.64:1 as text · chili on cherry 2.37:1 · cherry on maroon 1.27:1 · chili-300 on cotton 2.96:1 · gray-on-noir
on cotton 2.11:1 · chili as body text on noir.

**The Three-Red Rule.** Cherry selects, maroon deepens, chili signals. The roles are not
interchangeable.

**The Mark Exception.** The RG mark's one cherry bar sits on noir at 1.64:1, so it reads as a dark-red
slit among cotton bars, which is the portal in miniature. The mark is a logotype, `aria-hidden`, and
carries no information, so WCAG 1.4.11 does not apply. This is the only place cherry may sit on noir.

## Media

- **The hero frames** are drawn cover-fit on a canvas: centred, the backing store clamped so the
  cover scale never exceeds 1 (the current engine's rule), and noir bars beyond 2.4:1.
- **The figure matte** is an `<img>` with `object-fit: cover; object-position: 50% 50%` on the same box.
  It aligns with the canvas by construction and is visible only while frame 180 holds.
- **Type crosses media in three places only:**
  - The title card sits over frame 1 dimmed to 35 %.
  - The wordmark sits over frame 180, behind the matte.
  - The hero chrome sits at the frame edges.

  If a frame under the counter is bright, the `scrim-type` plate sits behind the label; it belongs to
  the type.
- **Works films and posters** are 4:5 (960×1200) with radius 8. They play muted, looped and inline, and
  only on fine-pointer hover.
- **Portraits** are 4:5 on desktop and 4:3 on phone, at full strength, never scrimmed and never under
  type.
- **The Real-Pixels Rule.** Work media is deterministic capture of the live sites; the Remotion films
  are made from those captures. Nothing is mocked up, and no reference board ships as a page image.

## Motion

GSAP 3.15 (core, ScrollTrigger, SplitText) and Lenis 1.3. The library earns its place three times, the
effect budget:
1. **The hero scrub.** One timeline at `scrub: 1` over the 320svh runway, following the beat sheet in
   the front-matter. Owner: phase 7, `src/scripts/hero/`.
2. **The masked-line reveal.** SplitText lines with a mask, yPercent 110 → 0, 0.62 s `expo.out`,
   stagger 0.07, start "top 85%". It applies to section heads, the statement line, pillar titles and
   the contact headline. The same effect gives pillar portraits and the stat row a 24 px rise (14 px on
   phone). Owner: phase 8, `src/scripts/reveal.ts`.
3. **The works float preview.** Lerp 0.14. Opens with a 0.78 s clip-path, closes in 0.24 s. Fine
   pointer and ≥ 960 px only. Owner: phase 8, `src/scripts/works/float-preview.ts`.

**State feedback is not an effect** and stays under 0.32 s: row hover 180 ms, cursor sizes 320 ms,
header theme 320 ms, tab active 260 ms and the progress rule.

**The Opacity-and-Transform Rule.** Reveals move opacity and transform only, never `autoAlpha`,
`visibility`, `display` or `content-visibility`. SplitText keeps the whole line in the accessibility
tree (`aria: "auto"`).

**Lenis** runs on wheel input only, on fine pointers, with reduced motion off. It is exposed as
`window.__lenis` for QA.

**Reduced-motion end state:**
- **No loader, no Lenis, no scrub.** The runway collapses to the 100svh stage, which shows frame 180
  (phone frame 90) with the matte and the wordmark already in place.
- **Reveals are off.** All content is visible on load.
- **Works** show the poster on hover and focus, never the film.
- **The cursor is hidden.**
- Every state and every link stays.

## The RG Mark

The portfolio's own mark is twelve **vertical** bars. Their geometry is Convenium's density ramp turned
90°: ratio 1.18, constant gap 4.01, read left to right from a hairline to full weight. The bars are
cotton on noir and ink on cotton; bar 8 (index 7, 0.618 of the way across, where the slit sits in KA)
is cherry. Sizes and the micro favicon ramp are in the front-matter. It is never the Convenium mark.
The Convenium logo appears only in works row 01 and on its poster.

## The Cursor

This is Convenium's difference disc, unchanged:
- **Sizes:** cotton, 10 px at rest, 28 px over links, and 72 px with the "View ↗" label over a work row.
- **Movement:** it follows the pointer exactly.
- **Hidden** on touch, coarse pointers and reduced motion.

There is no other custom cursor.

## Layout

- **Grid:** 12 columns from 1200, 8 from 960 to 1199, 4 below 960. The gutter is
  `clamp(20px, 2.5vw, 48px)`; the container inset runs 16 → 40 px.
- **Breakpoints:** **640 / 960 / 1200**, written as literals in every stylesheet and checked by
  `scripts/check-tokens.mjs`. Text columns keep their own measure: 62ch body, 46ch lede.
- **Bands** sit `clamp(64px, 7.5vw, 144px)` apart (40 px on phone).
- **Works rows** are 96 px minimum, with 1 px hairlines. On fine pointers ≥ 960 px they lay out as
  board C's rows. Everywhere else the same list is a scroll-snap carousel of 72vw cards.
- **Statement band** at ≥ 960: copy and stats take 8 columns, the noir aside 4. Below that it stacks,
  aside last.
- **Phone tab bar:** 64 px plus the bottom safe area. Content keeps `padding-bottom` equal to it, so
  nothing hides under it.

## Accessibility

- **Focus ring:** chili, 2 px, 3 px offset, on a `--ring-ground` spacer matching the field. Measured at
  3.88:1 on noir and 3.82:1 on cotton. Cherry is never the ring.
- **Landmarks:** one `header`, one `nav` (primary) plus the tab-bar `nav` (`nav.tabBarAria`), one
  `main`, one `footer`.
- **Skip link:** `nav.skip` on home, `cv.skip` on `/cv/`.
- **Headings:** H1 = the hero wordmark (`aria-label` "Rustam Gurbanov"), then one H2 per section and
  H3 for rows. On `/cv/` the H1 is the name.
- **Work rows** are each a single `<a>` to the live site with `target="_blank"`, `rel="noopener"` and a
  visually hidden `works.newTab`. The float preview is `aria-hidden` decoration.
- **The lightbox** is a modal dialog (`<dialog>` with `showModal()`): focus trapped, Escape closes it,
  and focus returns to the opener.
- **The language toggle** is two links (`hreflang`, `lang`), the current one with
  `aria-current="true"`.
- **The hero canvas** is `aria-hidden`. Frame 180's alt text is `hero.posterAlt` on the
  reduced-motion `<img>`.
- **Touch targets** are ≥ 44 px. The 12 px text floor holds everywhere.

## Known Deployment Debt

- Alt texts for the hero poster, pillar portraits, CV portrait and OG images are provisional until
  phase 4 delivers. Phase 8 must check them against the final images (COPY-NOTES point 6).
- **Open copy and spelling questions** go to Russ before phase 8 freezes copy:
  - Sonnwerk vs Sonn'werk.
  - The Convenium title.
  - The Orchestrate pillar line.
  - The legal "Stand" date.
- The scrub density of 11.6 px/frame at a 900 px viewport is below the old 14.5. Phase 7 must prove it
  with the fast-flick sweep. Only Russ may lengthen the runway.
- **Font files** are taken from the existing Convenium kits (OFL), and phase 6 records their licences
  in `public/fonts/LICENSES.md`.

## Do's and Don'ts

### Do
- **Do** draw every internal URL through the base helper, so the same build works on Pages
  (`/rustam-portfolio/`) and from disk.
- **Do** show each work's state label on screen in both languages, next to the sector.
- **Do** keep frame 180, the matte and the poster as one source, so the end hold never jumps.
- **Do** derive every number in CSS from `src/styles/tokens.css`, the executable copy of this
  front-matter.
- **Do** split a work's `sector` string on " · " into the Archivo sector word and the Inter state label.
- **Do** keep the hero chrome (nav, counter, ENTER) in the frame's negative space at the edges.

### Don't
- **Don't** add a gradient, glass, backdrop blur, decorative shadow, SVG grain or emoji icon. The old
  site's seam bloom and glitch are gone with it.
- **Don't** add a fourth effect: no parallax, marquee, magnetic buttons, text scramble or count-up
  figures.
- **Don't** put noir text on cherry or maroon, chili body text on noir, or cherry anywhere on noir
  except the mark's bar.
- **Don't** window the frame strip, re-encode it to AVIF or progressive JPEG, or load it with
  `fetch`.
- **Don't** let the 72 px floor of `--display-hero` override the fit on narrow screens. The fit
  wins, or the wordmark overflows.
- **Don't** use standalone Unicode glyphs as icons (✕, ☰, ↗ as a button). Close, menu and chevrons
  are CSS-drawn. Arrows inside copy strings stay as text.


## Amendments

| # | Date | Approved | Change |
|---|---|---|---|
| A1 | 2026-11-06 | Russ (after Gate B) | `budgets.js` 110 KB min / 45 KB gzip → **145 / 55**. The single IIFE measures 141 KB / 53.4 KB with GSAP core + ScrollTrigger + SplitText + Lenis; nothing removable without changing the reveal plan. Lighthouse performance on the shell stays 96. |
| A2 | 2026-11-06 | Russ (after phase 8) | `budgets.js` 145 / 55 → **150 / 58**. Phase 8 adds reveal, float preview, lightbox and spine (~3 KB); bundle measures 147 KB / 56.6 KB. Lighthouse performance 98–99. |
| A3 | 2026-11-06 | director (bug) | `tokens-from-design.mjs` split `floatSize` on the `x` inside `px`, emitting `--float-h: 400ppx`; generator fixed, tokens regenerated. No design change. |
