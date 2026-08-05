/* ==========================================================================
   FILE RG-2026 — cv.js
   Every block is optional: if a plugin failed to load, or JS dies here, the
   page underneath is still a complete, readable, printable CV.
   ========================================================================== */
(function () {
'use strict';

var root = document.documentElement;
var hasGSAP = typeof window.gsap !== 'undefined';
var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var isTouch = window.matchMedia('(hover: none)').matches;

function reg(name) {
  if (!hasGSAP || !window[name]) return false;
  try { gsap.registerPlugin(window[name]); return true; } catch (e) { return false; }
}
var hasST       = reg('ScrollTrigger');
var hasScrollTo = reg('ScrollToPlugin');
var hasSplit    = reg('SplitText');

var $  = function (s, c) { return (c || document).querySelector(s); };
var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

/* ==========================================================================
   i18n — the CV's own dictionary (EN/DE parity, same mechanism as main.js)
   ========================================================================== */
var I18N = {
  en: {
    'nav.langAria': 'Switch language',
    'whatsapp.aria': 'Chat on WhatsApp',
    'footer.copy': '© 2026 Rustam Gurbanov',
    'footer.portfolio': 'Portfolio',

    'cv.skip': 'Skip to experience',
    'cv.back': '← Back to portfolio',
    'cv.download': 'Download CV',
    'cv.selectedWork': 'Selected work →',
    'cv.dl': 'Download',
    'cv.spine.aria': 'Jump by section',
    'cv.spine.status': 'FILE OPEN',
    /* the six numbered tick labels reuse cv.vitals / cv.exp / cv.edu /
       cv.skills / cv.langs / cv.docs directly (see below) — no separate
       keys, so the rail can never say something different from the
       section heading it points to. Only the unnumbered close-tick needs
       its own string. */
    'cv.spine.tick.end': 'End',

    'cv.cover.kicker': 'PERSONNEL FILE · RG-2026',
    'cv.cover.docs': 'Documents ↓',
    'cv.cover.hint': 'OPEN FILE',
    'cv.role.1': 'ENGINEER',
    'cv.role.2': 'ORCHESTRATOR',
    'cv.role.3': 'DESIGNER',
    'cv.role.4': 'CREATOR',
    'cv.meta.subject': 'SUBJECT',
    'cv.meta.origin': 'ORIGIN',
    'cv.meta.station': 'STATION',
    'cv.meta.period': 'PERIOD',
    'cv.meta.pages': 'CONTENTS',
    'cv.meta.pagesVal': '4 ROLES · 2 DEGREES · 5 DOCUMENTS',
    'cv.id.cap': 'ID · RG-2026',
    'cv.seam.page': 'PAGE 01',

    'cv.vitals': 'Vitals',
    'cv.vitals.years': 'Years building',
    'cv.vitals.projects': 'Projects shipped',
    'cv.vitals.langs': 'Languages spoken',
    'cv.vitals.pipeline': 'Person, whole pipeline',
    'cv.vitals.statusKey': 'STATUS',
    'cv.vitals.statusVal': 'BASED IN KLAGENFURT, AUSTRIA · EU / REMOTE',

    'cv.exp': 'Experience',
    'cv.edu': 'Education',
    'cv.edu.now': 'present',
    'cv.skills': 'Capabilities',
    'cv.langs': 'Languages',
    'cv.docs': 'Documents',
    'cv.award.see': 'See certificate →',
    'cv.where.self': 'Self-directed',

    'cv.job.infineon.role': 'Digitalization Engineer, Fullstack Developer',
    'cv.job.infineon.dur': '2 yrs 7 mos',
    'cv.job.infineon.b1': 'Shipped fullstack tools for manufacturing digitalization — data workflows, APIs, and operator-facing UIs.',
    'cv.job.infineon.b2': 'Built and automated KNIME / OpenShift pipelines; IFX-KNIME Division Pioneer Award (E9Steps, 2024).',
    'cv.job.infineon.b3': 'Owned features end to end: TypeScript/React frontends, testing, Git workflows, and production handoff.',
    'cv.job.infineon.award': 'IFX-KNIME Division Pioneer Award · 2024',
    'cv.job.iba.role': 'Frontend Developer, Graphical Designer',
    'cv.job.iba.dur': '1 yr 8 mos',
    'cv.job.iba.b1': 'Designed and built frontend interfaces for bank digital products with HTML, CSS, JS, and React.',
    'cv.job.iba.b2': 'Produced brand-aligned graphic assets and UI systems that kept product and marketing in sync.',
    'cv.job.ibatech.role': 'Frontend Developer',
    'cv.job.ibatech.dur': '3 mos',
    'cv.job.ibatech.b1': 'Completed intensive frontend development track (DAN.IT / IBA Tech Academy) and shipped academy projects.',
    'cv.job.bank.role': 'Help desk specialist',
    'cv.job.bank.dur': '1 yr 3 mos',
    'cv.job.bank.b1': 'First-line support for customers and internal teams — triage, resolution, and clear handoffs.',
    'cv.job.bank.t1': 'Support',
    'cv.job.bank.t2': 'Triage',

    'cv.edu.master.role': 'Master of Game Studies and Engineering',
    'cv.edu.bach.role': 'Bachelor of Information Technologies (IT)',

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

    'cv.vault.lede': 'Five originals. Scanned, not summarised — open any one full size, or take the PDF.',
    'cv.vault.hint': 'Scroll to browse · click to open',
    'cv.doc.bach.title': 'Bachelor Certificate',
    'cv.doc.bach.desc': 'Degree certificate — Azerbaijan Technical University (Information Technologies).',
    'cv.doc.bach.pages': '5 pages',
    'cv.doc.pg1': '1 page',
    'cv.doc.iba.title': 'IBA Tech Academy — Frontend Certificate',
    'cv.doc.iba.desc': 'Completion certificate — Frontend Development (Oct–Dec 2019), IBA Tech Academy / DAN.IT.',
    'cv.doc.knime.title': 'IFX-KNIME Division Pioneer Award',
    'cv.doc.knime.desc': 'Infineon certificate of achievement — IDEA: E9Steps, Use Case Contest 2024.',
    'cv.doc.ref1.title': 'Reference Letter',
    'cv.doc.ref1.desc': 'Professional reference letter (scanned PDF).',
    'cv.doc.ref2.title': 'Reference Letter 2',
    'cv.doc.ref2.desc': 'Additional professional reference letter (scanned PDF).',
    'cv.lb.pdf': 'Open PDF',
    'cv.lb.close': 'Close',

    'cv.end.kicker': 'END OF FILE · RG-2026',
    'cv.end.line1': 'ONE PERSON.',
    'cv.end.line2': 'WHOLE PIPELINE.',
    'cv.end.cta': 'Start a project'
  },
  de: {
    'nav.langAria': 'Sprache wechseln',
    'whatsapp.aria': 'Auf WhatsApp schreiben',
    'footer.copy': '© 2026 Rustam Gurbanov',
    'footer.portfolio': 'Portfolio',

    'cv.skip': 'Zur Erfahrung springen',
    'cv.back': '← Zurück zum Portfolio',
    'cv.download': 'Lebenslauf laden',
    'cv.selectedWork': 'Ausgewählte Arbeiten →',
    'cv.dl': 'Download',
    'cv.spine.aria': 'Nach Abschnitt springen',
    'cv.spine.status': 'AKTE OFFEN',
    'cv.spine.tick.end': 'Ende',

    'cv.cover.kicker': 'PERSONALAKTE · RG-2026',
    'cv.cover.docs': 'Dokumente ↓',
    'cv.cover.hint': 'AKTE ÖFFNEN',
    'cv.role.1': 'ENGINEER',
    'cv.role.2': 'ORCHESTRATOR',
    'cv.role.3': 'DESIGNER',
    'cv.role.4': 'CREATOR',
    'cv.meta.subject': 'PERSON',
    'cv.meta.origin': 'HERKUNFT',
    'cv.meta.station': 'STANDORT',
    'cv.meta.period': 'ZEITRAUM',
    'cv.meta.pages': 'INHALT',
    'cv.meta.pagesVal': '4 STATIONEN · 2 ABSCHLÜSSE · 5 DOKUMENTE',
    'cv.id.cap': 'ID · RG-2026',
    'cv.seam.page': 'SEITE 01',

    'cv.vitals': 'Eckdaten',
    'cv.vitals.years': 'Jahre Praxis',
    'cv.vitals.projects': 'Projekte geliefert',
    'cv.vitals.langs': 'Sprachen',
    'cv.vitals.pipeline': 'Person, ganze Pipeline',
    'cv.vitals.statusKey': 'STATUS',
    'cv.vitals.statusVal': 'ANSÄSSIG IN KLAGENFURT, ÖSTERREICH · EU / REMOTE',

    'cv.exp': 'Erfahrung',
    'cv.edu': 'Ausbildung',
    'cv.edu.now': 'heute',
    'cv.skills': 'Fähigkeiten',
    'cv.langs': 'Sprachen',
    'cv.docs': 'Dokumente',
    'cv.award.see': 'Zertifikat ansehen →',
    'cv.where.self': 'Eigenprojekte',

    'cv.job.infineon.role': 'Digitalization Engineer, Fullstack Developer',
    'cv.job.infineon.dur': '2 J. 7 Mon.',
    'cv.job.infineon.b1': 'Fullstack-Tools für Fertigungsdigitalisierung — Datenworkflows, APIs und bedienernahe UIs.',
    'cv.job.infineon.b2': 'KNIME-/OpenShift-Pipelines gebaut und automatisiert; IFX-KNIME Division Pioneer Award (E9Steps, 2024).',
    'cv.job.infineon.b3': 'Features end-to-end: TypeScript/React-Frontends, Testing, Git-Workflows und Production-Handoff.',
    'cv.job.infineon.award': 'IFX-KNIME Division Pioneer Award · 2024',
    'cv.job.iba.role': 'Frontend Developer, Graphical Designer',
    'cv.job.iba.dur': '1 J. 8 Mon.',
    'cv.job.iba.b1': 'Frontend-Interfaces für digitale Bankprodukte mit HTML, CSS, JS und React.',
    'cv.job.iba.b2': 'Markenkonforme Grafiken und UI-Systeme — Produkt und Marketing im Gleichklang.',
    'cv.job.ibatech.role': 'Frontend Developer',
    'cv.job.ibatech.dur': '3 Mon.',
    'cv.job.ibatech.b1': 'Intensivkurs Frontend Development (DAN.IT / IBA Tech Academy) und ausgelieferte Academy-Projekte.',
    'cv.job.bank.role': 'Help desk specialist',
    'cv.job.bank.dur': '1 J. 3 Mon.',
    'cv.job.bank.b1': 'First-Level-Support für Kunden und interne Teams — Triage, Lösung, klare Übergaben.',
    'cv.job.bank.t1': 'Support',
    'cv.job.bank.t2': 'Triage',

    'cv.edu.master.role': 'Master of Game Studies and Engineering',
    'cv.edu.bach.role': 'Bachelor of Information Technologies (IT)',

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

    'cv.vault.lede': 'Fünf Originale. Gescannt, nicht zusammengefasst — in voller Größe öffnen oder als PDF laden.',
    'cv.vault.hint': 'Scrollen zum Blättern · klicken zum Öffnen',
    'cv.doc.bach.title': 'Bachelor-Zeugnis',
    'cv.doc.bach.desc': 'Abschlusszeugnis — Azerbaijan Technical University (Information Technologies).',
    'cv.doc.bach.pages': '5 Seiten',
    'cv.doc.pg1': '1 Seite',
    'cv.doc.iba.title': 'IBA Tech Academy — Frontend-Zertifikat',
    'cv.doc.iba.desc': 'Abschlusszertifikat — Frontend Development (Okt–Dez 2019), IBA Tech Academy / DAN.IT.',
    'cv.doc.knime.title': 'IFX-KNIME Division Pioneer Award',
    'cv.doc.knime.desc': 'Infineon-Auszeichnung — IDEA: E9Steps, Use Case Contest 2024.',
    'cv.doc.ref1.title': 'Empfehlungsschreiben',
    'cv.doc.ref1.desc': 'Professionelles Empfehlungsschreiben (gescanntes PDF).',
    'cv.doc.ref2.title': 'Empfehlungsschreiben 2',
    'cv.doc.ref2.desc': 'Weiteres professionelles Empfehlungsschreiben (gescanntes PDF).',
    'cv.lb.pdf': 'PDF öffnen',
    'cv.lb.close': 'Schließen',

    'cv.end.kicker': 'ENDE DER AKTE · RG-2026',
    'cv.end.line1': 'EINE PERSON.',
    'cv.end.line2': 'GANZE PIPELINE.',
    'cv.end.cta': 'Projekt starten'
  }
};

var LANG_KEY = 'rg-lang';
var currentLang = localStorage.getItem(LANG_KEY) === 'de' ? 'de' : 'en';

function applyLang(lang) {
  currentLang = lang === 'de' ? 'de' : 'en';
  try { localStorage.setItem(LANG_KEY, currentLang); } catch (e) {}
  root.lang = currentLang;
  var dict = I18N[currentLang];
  $$('[data-i18n]').forEach(function (el) {
    var k = el.getAttribute('data-i18n');
    if (dict[k] != null) el.textContent = dict[k];
  });
  $$('[data-i18n-aria]').forEach(function (el) {
    var k = el.getAttribute('data-i18n-aria');
    if (dict[k] != null) el.setAttribute('aria-label', dict[k]);
  });
  var t = $('#lang-toggle');
  if (t) t.setAttribute('aria-pressed', currentLang === 'de' ? 'true' : 'false');
}
applyLang(currentLang);

var langToggle = $('#lang-toggle');
if (langToggle) {
  langToggle.addEventListener('click', function () {
    applyLang(currentLang === 'en' ? 'de' : 'en');
    if (hasST) ScrollTrigger.refresh();
  });
}

/* ==========================================================================
   Smooth scroll — desktop only, same version + guard as index.html
   ========================================================================== */
var lenis = null;
if (!isTouch && !reduced && typeof window.Lenis !== 'undefined') {
  lenis = new Lenis({ duration: 1.05, smoothWheel: true, smoothTouch: false });
  window.__lenis = lenis;
  if (hasGSAP && hasST) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

/* smooth in-page jumps (spine ticks, cover CTA, award link) */
$$('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var y = target.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - 96;
    if (lenis) lenis.scrollTo(y, { duration: 1.1 });
    else if (hasGSAP && hasScrollTo) gsap.to(window, { scrollTo: y, duration: reduced ? 0 : .8, ease: 'power2.inOut' });
    else window.scrollTo(0, y);
    if (history.replaceState) history.replaceState(null, '', id);
  });
});

/* ==========================================================================
   TOPBAR — solid chip, so it must retract rather than sit on body copy.
   Down = hide, up = show, always visible at the top of the page and whenever
   anything inside it has focus (keyboard users never lose the nav).
   ========================================================================== */
(function () {
  var bar = $('.cv-topbar');
  if (!bar) return;
  var lastY = window.scrollY || 0, locked = false;
  bar.addEventListener('focusin', function () { locked = true; root.classList.remove('bar-hidden'); });
  bar.addEventListener('focusout', function () { locked = false; });
  window.addEventListener('scroll', function () {
    var y = window.scrollY || 0;
    if (locked) { lastY = y; return; }
    if (y < 120) root.classList.remove('bar-hidden');
    else if (y > lastY + 6) root.classList.add('bar-hidden');
    else if (y < lastY - 6) root.classList.remove('bar-hidden');
    lastY = y;
  }, { passive: true });
})();

/* ==========================================================================
   THE SPINE — section index, live position readout, progress fill.
   Ticks are positioned by each target section's REAL height, not an even
   split: Vitals and Career/Experience are wildly different lengths, and a
   fake even split would lie about where you actually are in the document.
   The rail's domain is #vitals (0%) through #endcard (100%) — the cover is
   a bookend the rail stays hidden over (see .spine-in toggle below).
   ========================================================================== */
var spinePos = $('#spine-pos');
var spineFill = $('#spine-fill');
var ticks = $$('.spine__tick');
var spineDomainStart = $('#vitals');
var spineDomainEnd = $('#endcard');

function layoutSpineTicks() {
  if (!spineDomainStart || !spineDomainEnd) return;
  var top0 = spineDomainStart.getBoundingClientRect().top + window.scrollY;
  var top1 = spineDomainEnd.getBoundingClientRect().top + window.scrollY;
  var span = top1 - top0;
  if (span <= 0) return;
  ticks.forEach(function (t) {
    if (t.hasAttribute('data-end')) { t.style.top = '100%'; return; }
    var a = t.querySelector('a');
    var target = a && $(a.getAttribute('href'));
    if (!target) return;
    var y = target.getBoundingClientRect().top + window.scrollY;
    t.style.top = Math.max(0, Math.min(100, (y - top0) / span * 100)) + '%';
  });
}
layoutSpineTicks();
addEventListener('resize', layoutSpineTicks);
/* a window resize is covered above; ScrollTrigger.refresh() also fires on
   its own (e.g. after the vault's late image loads settle the page height
   below), and ticks need to be recomputed then too */
if (hasST) ScrollTrigger.addEventListener('refresh', layoutSpineTicks);

var shownSection = null;
function setSection(n) {
  if (n === shownSection) return;
  shownSection = n;
  if (spinePos) spinePos.textContent = n;
  ticks.forEach(function (t) {
    t.classList.toggle('is-live', t.dataset.section === n);
  });
}
setSection('01');

/* ==========================================================================
   Everything scroll-driven. One matchMedia so reduced-motion is a real
   branch, not a pile of if-statements.
   ========================================================================== */
var pinST = null;
var deck = $('#deck');
var deckPinned = false;

if (hasGSAP && hasST) {
  var mm = gsap.matchMedia();

  /* ---------- always on, motion or not ---------- */
  mm.add('all', function () {

    /* chrome theme: flip on the section boundary crossing the viewport middle.
       The topbar is theme-independent by design, so only the spine flips —
       nothing can end up invisible at a boundary. */
    $$('.cv-sec, .cv-seam').forEach(function (sec) {
      var paper = sec.classList.contains('cv-sec--paper') || sec.classList.contains('cv-seam');
      ScrollTrigger.create({
        trigger: sec,
        start: 'top center',
        end: 'bottom center',
        onToggle: function (self) {
          if (self.isActive) root.classList.toggle('chrome-paper', paper);
        }
      });
    });

    /* spine position readout per section — one entry per numbered chapter;
       #endcard has no chapter of its own, so it holds at the last number
       (06) rather than reading blank through the close */
    var sectionOf = [
      ['#vitals', '01'], ['#career', '02'], ['#education', '03'],
      ['#capabilities', '04'], ['#languages', '05'], ['#vault', '06'],
      ['#endcard', '06']
    ];
    sectionOf.forEach(function (pair) {
      var el = $(pair[0]);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el, start: 'top center', end: 'bottom center',
        onEnter: function () { setSection(pair[1]); },
        onEnterBack: function () { setSection(pair[1]); }
      });
    });

    /* the rail fades in once the reader has scrolled past the cover, and
       hides again scrolling back up into it — it never competes with the
       cover's own full-bleed composition */
    var coverSec = $('#cover');
    if (coverSec) {
      ScrollTrigger.create({
        trigger: coverSec, start: 'bottom top',
        onEnter: function () { root.classList.add('spine-in'); },
        onLeaveBack: function () { root.classList.remove('spine-in'); }
      });
    }

    /* progress fill down the rail — scoped to the same domain as the ticks
       (Vitals start to Endcard start), not the whole document including
       the cover the rail stays hidden over */
    if (spineFill && spineDomainStart && spineDomainEnd) {
      ScrollTrigger.create({
        trigger: spineDomainStart, start: 'top top',
        endTrigger: spineDomainEnd, end: 'top top',
        onUpdate: function (self) { spineFill.style.height = (self.progress * 100) + '%'; }
      });
    }

    /* the file closes on the end card */
    var status = $('.spine__status');
    if (status) {
      ScrollTrigger.create({
        trigger: '#endcard', start: 'top center',
        onEnter: function () {
          status.classList.add('is-closed');
          var l = $('[data-i18n="cv.spine.status"]', status);
          if (l) l.textContent = currentLang === 'de' ? 'AKTE GESCHLOSSEN' : 'FILE CLOSED';
        },
        onLeaveBack: function () {
          status.classList.remove('is-closed');
          var l = $('[data-i18n="cv.spine.status"]', status);
          if (l) l.textContent = I18N[currentLang]['cv.spine.status'];
        }
      });
    }

    /* language gauges — content, so they fill in every mode */
    $$('.cv-lang').forEach(function (li) {
      var lvl = parseInt(li.getAttribute('data-level'), 10) || 0;
      var segs = $$('.cv-lang__gauge i', li);
      ScrollTrigger.create({
        trigger: li, start: 'top 88%', once: true,
        onEnter: function () {
          segs.forEach(function (s, i) {
            if (i < lvl) setTimeout(function () { s.classList.add('is-on'); }, reduced ? 0 : i * 55);
          });
        }
      });
    });
  });

  /* ---------- full motion ---------- */
  mm.add('(prefers-reduced-motion: no-preference)', function () {

    /* reveals — touch keeps the old vertical-position reveal for cards too;
       desktop cards are revealed by the pinned horizontal scrub below */
    var revealSelectors = [
      '.cv-meta__row', '.cv-cover__actions', '.cv-id',
      '.cv-vital', '.cv-status', '.cv-role', '.cv-degree',
      '.cv-cap', '.cv-lang', '.cv-vault__lede',
      '.cv-end__title span', '.cv-end__actions', '.cv-end__links'
    ];
    if (isTouch) revealSelectors.push('.cv-doc');
    var revealTargets = $$(revealSelectors.join(','));
    revealTargets.forEach(function (el) { el.classList.add('cv-in'); });

    revealTargets.forEach(function (el) {
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () { el.classList.add('is-in'); }
      });
    });

    /* THE VAULT, desktop: pin the whole section and scrub the deck
       horizontally as the page scrolls, until the last card clears — then
       release the pin and the page continues normally. Distances are
       recomputed on every ScrollTrigger.refresh() (invalidateOnRefresh) so
       a window resize can't leave the pinned scroll distance stale. */
    if (!isTouch) {
      var vaultSec = $('#vault');
      var getDeckMax = function () { return deck ? Math.max(0, deck.scrollWidth - deck.clientWidth) : 0; };
      if (deck && vaultSec && getDeckMax() > 0) {
        deck.classList.add('cv-deck--pin');
        deckPinned = true;

        var deckTween = gsap.to(deck, {
          x: function () { return -getDeckMax(); }, ease: 'none',
          scrollTrigger: {
            id: 'vault-pin', trigger: vaultSec, start: 'top top',
            end: function () { return '+=' + getDeckMax(); },
            pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true
          }
        });

        $$('.cv-doc', deck).forEach(function (card) {
          card.classList.add('cv-in');
          ScrollTrigger.create({
            containerAnimation: deckTween, trigger: card,
            start: 'left 85%', once: true,
            onEnter: function () { card.classList.add('is-in'); }
          });
        });

        /* keyboard focus must still bring an offscreen card into view —
           there is no scrollable ancestor left for the browser to do that */
        $$('.cv-doc__open', deck).forEach(function (a) {
          a.addEventListener('focus', function () {
            var max = getDeckMax();
            if (!max) return;
            var st = deckTween.scrollTrigger;
            var card = a.closest('.cv-doc');
            var relLeft = card.getBoundingClientRect().left - deck.getBoundingClientRect().left;
            var targetX = Math.min(0, Math.max(-max, -(relLeft - (deck.clientWidth - card.offsetWidth) / 2)));
            var progress = targetX / -max;
            var y = st.start + progress * (st.end - st.start);
            if (lenis) lenis.scrollTo(y, { duration: .6 });
            else window.scrollTo(0, y);
          });
        });
      } else if (deck) {
        $$('.cv-doc', deck).forEach(function (card) { card.classList.add('cv-in', 'is-in'); });
      }
    }

    /* cover name — char mask reveal */
    if (hasSplit) {
      try {
        $$('.cv-cover__line').forEach(function (line, i) {
          var split = new SplitText(line, { type: 'chars' });
          gsap.from(split.chars, {
            yPercent: 118, duration: 1.05, ease: 'power4.out',
            stagger: 0.028, delay: 0.1 + i * 0.11
          });
        });
      } catch (e) { /* type stays put — still perfect */ }
    }

    gsap.from('.cv-kicker', { opacity: 0, duration: .8, delay: .05 });
    gsap.from('.cv-cover__hint span:first-child', { scaleX: 0, duration: 1, delay: .9, ease: 'power3.out' });

    /* role roller */
    var rollerItems = $$('.cv-roller__item');
    if (rollerItems.length > 1) {
      var ri = 0;
      setInterval(function () {
        var out = rollerItems[ri];
        ri = (ri + 1) % rollerItems.length;
        var into = rollerItems[ri];
        gsap.to(out, { yPercent: -100, opacity: 0, duration: .5, ease: 'power3.inOut',
          onComplete: function () { out.classList.remove('is-current'); gsap.set(out, { yPercent: 100, opacity: 0 }); } });
        into.classList.add('is-current');
        gsap.fromTo(into, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .5, ease: 'power3.inOut' });
      }, 2400);
    }

    /* the file opens: paper slides up over the pinned cover */
    pinST = ScrollTrigger.create({
      trigger: '#cover', start: 'top top', end: 'bottom top',
      pin: '.cv-cover__inner', pinSpacing: false, anticipatePin: 1
    });
    gsap.to('.cv-cover__inner', {
      opacity: .12, scale: .965, ease: 'none',
      scrollTrigger: { trigger: '#cover', start: 'center top', end: 'bottom top', scrub: .5 }
    });

    /* ID photo parallax */
    gsap.to('.cv-id__img', {
      yPercent: -7, ease: 'none',
      scrollTrigger: { trigger: '#cover', start: 'top top', end: 'bottom top', scrub: .6 }
    });

    /* counters */
    $$('.cv-vital__n').forEach(function (n) {
      var to = parseFloat(n.getAttribute('data-count')) || 0;
      var obj = { v: 0 };
      ScrollTrigger.create({
        trigger: n, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(obj, { v: to, duration: 1.5, ease: 'power2.out',
            onUpdate: function () { n.textContent = Math.round(obj.v); } });
        }
      });
    });

    /* native language names shuffle into place (no plugin — plain JS) */
    var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZəğıöşüÇÄÖÜАБВГДЕЖЗИЙКЛМНОПРС';
    $$('.cv-lang__native').forEach(function (el) {
      var final = el.getAttribute('data-native') || el.textContent;
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          var frame = 0, total = 16;
          var id = setInterval(function () {
            frame++;
            var shown = final.split('').map(function (ch, i) {
              if (ch === ' ') return ' ';
              if (i < final.length * (frame / total)) return ch;
              return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }).join('');
            el.textContent = shown;
            if (frame >= total) { clearInterval(id); el.textContent = final; }
          }, 34);
        }
      });
    });
  });

  /* ---------- reduced motion: complete, calm, everything final ---------- */
  mm.add('(prefers-reduced-motion: reduce)', function () {
    $$('.cv-vital__n').forEach(function (n) { n.textContent = n.getAttribute('data-count'); });
    $$('.cv-roller__item').forEach(function (it, i) {
      if (i > 0) it.style.display = 'none';
    });
  });
}

/* ==========================================================================
   PRINT — a pinned element is position:fixed inside a pin-spacer, which makes
   the cover repeat mid-document and swallows whole sections. Revert the pin
   (and any inline transforms the reveals left behind) before the print
   snapshot, then put it all back.
   ========================================================================== */
function forPrint(on) {
  if (!hasGSAP) return;
  if (pinST) { on ? pinST.disable(false) : pinST.enable(); }
  var frozen = $$('.cv-cover__inner, .cv-id__img, .cv-in');
  if (on) gsap.set(frozen, { clearProps: 'transform,opacity,visibility' });
  if (!on && hasST) ScrollTrigger.refresh();
}
window.addEventListener('beforeprint', function () { forPrint(true); });
window.addEventListener('afterprint', function () { forPrint(false); });
/* Chrome headless / print-preview path fires the media query, not the events */
if (window.matchMedia) {
  var pmq = window.matchMedia('print');
  var onPrintChange = function (e) { forPrint(e.matches); };
  if (pmq.addEventListener) pmq.addEventListener('change', onPrintChange);
  else if (pmq.addListener) pmq.addListener(onPrintChange);
}

/* ==========================================================================
   THE VAULT — mouse drag fallback. Only runs when the pinned scrub above
   didn't engage (no GSAP/ScrollTrigger, or reduced-motion). Layered on top
   of a native scroll container, so touch, keyboard and no-JS all keep working.
   ========================================================================== */
/* NOTE: deliberately NOT GSAP Draggable here. Draggable's `type:"scrollLeft"`
   wraps the container's children in a plain <div> proxy, which becomes the
   only flex child and collapses the deck into a vertical stack. This is a
   hand-rolled drag over the native scroll container instead: the scrollbar,
   touch scrolling, snap points and keyboard order all survive.
   No setPointerCapture on pointerdown — that has silently killed click
   handlers in this project before. */
var dragged = false;
if (deck && !isTouch && !deckPinned) {
  var down = false, startX = 0, startScroll = 0, lastX = 0, vel = 0, glideId = 0;

  deck.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    down = true; dragged = false;
    startX = lastX = e.clientX;
    startScroll = deck.scrollLeft;
    vel = 0;
    cancelAnimationFrame(glideId);
    root.classList.add('deck-dragging');
  });

  window.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 6) dragged = true;
    vel = e.clientX - lastX;
    lastX = e.clientX;
    deck.scrollLeft = startScroll - dx;
  });

  window.addEventListener('pointerup', function () {
    if (!down) return;
    down = false;
    root.classList.remove('deck-dragging');
    if (reduced || Math.abs(vel) < 2) return;
    var v = vel;
    var glide = function () {
      v *= 0.94;
      deck.scrollLeft -= v;
      if (Math.abs(v) > 0.4) glideId = requestAnimationFrame(glide);
    };
    glideId = requestAnimationFrame(glide);
  });

  /* a drag must never count as a click on a card */
  deck.addEventListener('click', function (e) {
    if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; }
  }, true);
}

/* ==========================================================================
   LIGHTBOX — full-page scan. The <a> href is the image, so with no JS the
   link simply opens the scan.
   ========================================================================== */
var lb = $('#lightbox');
var lbImg = $('#lb-img');
var lbTitle = $('#lb-title');
var lbPdf = $('#lb-pdf');
var lbClose = $('#lb-close');
var lastFocused = null;

function openLightbox(trigger) {
  if (!lb) return;
  lastFocused = trigger;
  var card = trigger.closest('.cv-doc');
  var titleEl = $('.cv-doc__title', card);
  lbImg.src = trigger.getAttribute('href');
  lbImg.alt = titleEl ? titleEl.textContent : '';
  lbTitle.textContent = titleEl ? titleEl.textContent : '';
  lbPdf.href = trigger.getAttribute('data-pdf') || '#';
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  if (lenis) lenis.stop();
  lbClose.focus();
}

function closeLightbox() {
  if (!lb || lb.hidden) return;
  lb.hidden = true;
  lbImg.src = '';
  document.body.style.overflow = '';
  if (lenis) lenis.start();
  if (lastFocused) lastFocused.focus();
}

$$('.cv-doc__open').forEach(function (a) {
  a.addEventListener('click', function (e) {
    if (!lb) return;                       // no lightbox markup → follow the link
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    openLightbox(a);
  });
});

if (lbClose) lbClose.addEventListener('click', closeLightbox);
if (lb) {
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('cv-lightbox__stage')) closeLightbox();
  });
}

document.addEventListener('keydown', function (e) {
  if (!lb || lb.hidden) return;
  if (e.key === 'Escape') { closeLightbox(); return; }
  if (e.key !== 'Tab') return;
  /* focus trap */
  var f = $$('a[href], button:not([disabled])', lb).filter(function (el) { return el.offsetParent !== null; });
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* arrow-key navigation across the deck */
$$('.cv-doc__open').forEach(function (a, i, all) {
  a.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    var next = all[e.key === 'ArrowRight' ? i + 1 : i - 1];
    if (next) next.focus();
  });
});

})();
