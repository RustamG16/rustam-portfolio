// Lenis: wheel input only, fine pointers only, off under reduced motion. Touch stays native.
// Exposed as window.__lenis so QA can park it: __lenis.scrollTo(y, { immediate: true }).
import Lenis from 'lenis';
import { gsap, ScrollTrigger, type Env } from './env';

export function init(env: Env): Lenis | null {
  if (!env.finePointer || env.reduced) return null;

  const lenis = new Lenis({
    autoRaf: false,
    smoothWheel: true,
    syncTouch: false,
    lerp: 0.1,
    anchors: true,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    // One exception here would kill Lenis, ScrollTrigger and every tween on the page.
    try {
      lenis.raf(time * 1000);
    } catch (err) {
      console.error('[lenis]', err);
    }
  });
  gsap.ticker.lagSmoothing(0);

  window.__lenis = lenis;
  return lenis;
}
