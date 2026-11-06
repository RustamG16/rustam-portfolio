// FROZEN after phase 6 (changed only by a DESIGN.md amendment approved at a gate).
// Bundle entry: esbuild turns this into ONE classic IIFE (public/js/site.js), the only shape that runs from file://.
// Init order (architecture.md section 8): env -> lenis -> header -> cursor -> page modules -> fonts.ready refresh.
// The loader initialises first: it is on screen from first paint and must not wait for the rest.
import { env, ScrollTrigger } from './env';
import { init as initLoader } from './hero/loader';
import { init as initLenis } from './lenis';
import { init as initHeader } from './header';
import { init as initCursor } from './cursor';
import { init as initHero } from './hero/hero';
import { init as initWorks } from './works/float-preview';
import { init as initReveal } from './reveal';
import { init as initSpine } from './cv/spine';
import { init as initLightbox } from './cv/lightbox';

const has = (sel: string): boolean => document.querySelector(sel) !== null;

function boot(): void {
  initLoader(env);
  initLenis(env);
  initHeader(env);
  initCursor(env);

  if (has('[data-hero]')) initHero(env);
  if (has('[data-works]')) initWorks(env);
  if (has('[data-reveal]') || has('[data-reveal-scope]')) initReveal(env);
  if (has('[data-cv-spine]')) initSpine(env);
  if (has('[data-lightbox]')) initLightbox(env);

  void document.fonts.ready.then(() => ScrollTrigger.refresh());
  // QA marker: the bundle ran to the end of boot (file:// proof)
  document.documentElement.dataset.js = 'ready';
}

boot();
