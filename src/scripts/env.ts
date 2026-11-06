// Environment, read once. Registers the GSAP plugins once. No storage, no fetch.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Breakpoints (DESIGN.md): written as literals everywhere else. */
export const BP = { sm: 640, md: 960, lg: 1200 } as const;

export const MQ = {
  reduced: '(prefers-reduced-motion: reduce)',
  finePointer: '(hover: hover) and (pointer: fine)',
  desktopMotion: `(min-width: ${BP.md}px) and (prefers-reduced-motion: no-preference)`,
  mobileMotion: `(max-width: ${BP.md - 1}px) and (prefers-reduced-motion: no-preference)`,
  portrait: '(orientation: portrait)',
} as const;

export interface Env {
  reduced: boolean;
  finePointer: boolean;
  /** Base path with trailing slash, from <html data-base>. Media URLs are base + 'frames/...'. */
  base: string;
  lang: 'en' | 'de';
  page: string;
}

const root = document.documentElement;
const mm = (q: string): boolean => {
  try {
    return window.matchMedia(q).matches;
  } catch {
    return false;
  }
};

export const env: Env = {
  reduced: mm(MQ.reduced),
  finePointer: mm(MQ.finePointer),
  base: root.dataset.base ?? '/',
  lang: root.dataset.lang === 'de' ? 'de' : 'en',
  page: root.dataset.page ?? 'home',
};

export { gsap, ScrollTrigger, SplitText };
