// Effect 2 of 3: the masked-line reveal (DESIGN.md Motion, architecture.md 8.2). ONE pattern, two hooks:
//   [data-reveal="lines"]  SplitText lines inside a clip mask, yPercent 110 -> 0, 0.62 s expo.out, stagger 0.07,
//                          start "top 85%", once. SplitText keeps the whole line in the accessibility tree (aria: "auto").
//   [data-reveal="block"]  media / stat blocks rise 24 px (14 px below 960) with opacity, 0.78 s expo.out, same start.
// Opacity and transform only: never the auto-alpha shorthand, visibility or display. Under reduced motion this does nothing, so every
// word and link is simply there on first paint. Without JS nothing is hidden either (the hidden state is applied here).
import { gsap, ScrollTrigger, SplitText, type Env } from './env';

const START = 'top 85%';
const PHONE = '(max-width: 959px)';

export function init(env: Env): void {
  if (env.reduced) return;

  const yBlock = window.matchMedia(PHONE).matches ? 14 : 24;

  document.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'rv-line', // SplitText names the clip wrapper rv-line-mask
      autoSplit: true,
      // aria-label is only valid on headings; on a paragraph the lines stay plain text in the tree (no label, no hiding)
      aria: /^H[1-6]$/.test(el.tagName) ? 'auto' : 'none',
      onSplit(self) {
        // Returned, so SplitText reverts it on a re-split (font swap, resize) and fast-forwards the new tween.
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 0.62,
          ease: 'expo.out',
          stagger: 0.07,
          scrollTrigger: { trigger: el, start: START, once: true, refreshPriority: 1 },
        });
      },
    });
  });

  document.querySelectorAll<HTMLElement>('[data-reveal="block"]').forEach((el) => {
    gsap.from(el, {
      y: yBlock,
      opacity: 0,
      duration: 0.78,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: START, once: true, refreshPriority: 1 },
    });
  });

  ScrollTrigger.refresh();
}
