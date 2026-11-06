// The difference disc: 10 / 28 / 72 px, exact pointer position via transform in rAF (no lerp: the float
// preview is the lerped object). Modes come from data-cursor="link|view" on targets; plain a/button = link.
// Not mounted on coarse pointers or under reduced motion. Shares the gsap ticker (one rAF for all motion).
import { gsap, type Env } from './env';

export function init(env: Env): void {
  const root = document.querySelector<HTMLElement>('[data-cursor-root]');
  if (!root) return;
  if (!env.finePointer || env.reduced) {
    root.remove();
    return;
  }

  document.documentElement.classList.add('has-cursor');

  let x = -100;
  let y = -100;
  let dirty = false;
  let shown = false;
  let mode: 'dot' | 'link' | 'view' = 'dot';

  const setMode = (m: 'dot' | 'link' | 'view'): void => {
    if (m === mode) return;
    mode = m;
    root.dataset.mode = m;
  };

  const modeFor = (target: EventTarget | null): 'dot' | 'link' | 'view' => {
    if (!(target instanceof Element)) return 'dot';
    const hit = target.closest<HTMLElement>('[data-cursor], a, button, summary, [role="button"]');
    if (!hit) return 'dot';
    return hit.dataset.cursor === 'view' ? 'view' : 'link';
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      x = e.clientX;
      y = e.clientY;
      dirty = true;
      if (!shown) {
        shown = true;
        root.classList.add('is-on');
      }
      setMode(modeFor(e.target));
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => {
    shown = false;
    root.classList.remove('is-on');
  });
  document.addEventListener('pointerenter', () => {
    shown = true;
    root.classList.add('is-on');
  });

  gsap.ticker.add(() => {
    try {
      if (!dirty) return;
      dirty = false;
      root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    } catch (err) {
      console.error('[cursor]', err);
    }
  });
}
