// PHASE 7 — working version from phase 6; phase 7 owns this file and may refine it.
// Curtain: twelve RG bars rise left to right (34 ms apart, 0.62 s expo.out), "Klagenfurt · 2026" under them.
// Lifts (yPercent -100, 0.24 s) when the hero has decoded frame 1 + every 8th frame (it dispatches
// window event "hero:coarse-ready"), or so that the curtain is fully gone by LOADER_MAX (0.9 s hard cap).
// Skipped for reduced motion, no-JS and internal navigation (the head script never sets html.loader-on).
// Stores nothing.
import { gsap, type Env } from '../env';

const LOADER_MAX = 0.9; // seconds, hard cap: the curtain has left by then
const LIFT = 0.24;
const MIN_HOLD = 0.42; // never flash: let the bars land first

export function init(env: Env): void {
  const el = document.querySelector<HTMLElement>('[data-loader]');
  if (!el) return;
  const root = document.documentElement;

  const finish = (): void => {
    root.classList.remove('loader-on');
    el.remove();
    window.dispatchEvent(new Event('loader:done'));
  };

  if (env.reduced || !root.classList.contains('loader-on')) {
    finish();
    return;
  }

  const bars = el.querySelectorAll<SVGElement>('.mark__bar');
  const line = el.querySelector<HTMLElement>('.loader__line');
  if (line) gsap.set(line, { opacity: 0 });
  gsap.to(bars, { scaleY: 1, transformOrigin: '50% 100%', duration: 0.62, ease: 'expo.out', stagger: 0.034 });
  if (line) gsap.to(line, { opacity: 1, duration: 0.24, delay: 0.12 });

  const t0 = performance.now();
  let lifted = false;
  const lift = (): void => {
    if (lifted) return;
    lifted = true;
    gsap.to(el, { yPercent: -100, duration: LIFT, ease: 'power2.inOut', onComplete: finish });
  };
  const liftAfterHold = (): void => {
    const waited = (performance.now() - t0) / 1000;
    gsap.delayedCall(Math.max(0, MIN_HOLD - waited), lift);
  };

  window.addEventListener('hero:coarse-ready', liftAfterHold, { once: true });
  gsap.delayedCall(LOADER_MAX - LIFT, lift);
}
