// Frame-set constants, copied from DESIGN.md hero.frames. Hero.astro serialises these into data-* attributes.
// Baseline JPEG only: never progressive, never AVIF. Hold every frame; never window a scrub.

export interface FrameSet {
  /** Path relative to the base, without the zero-padded index. */
  path: string;
  ext: '.jpg';
  pad: 4;
  count: number;
  w: number;
  h: number;
  matte: string;
  poster: string;
}

export const FRAMES: { desktop: FrameSet; phone: FrameSet } = {
  desktop: {
    path: 'frames/hero/desktop/frame_',
    ext: '.jpg',
    pad: 4,
    count: 180,
    w: 1920,
    h: 1080,
    matte: 'frames/hero/desktop/matte.webp',
    poster: 'frames/hero/desktop/frame_0180.jpg',
  },
  phone: {
    path: 'frames/hero/phone/frame_',
    ext: '.jpg',
    pad: 4,
    count: 90,
    w: 720,
    h: 1280,
    matte: 'frames/hero/phone/matte.webp',
    poster: 'frames/hero/phone/frame_0090.jpg',
  },
};

/** Coarse-first request order: frame 1, every 8th, the last, then the rest in index order. */
export const COARSE_STEP = 8;
export const SEARCH_RADIUS = 8;

/** 'frames/hero/desktop/frame_0042.jpg' for index 41 (0-based). */
export function frameName(set: FrameSet, index: number): string {
  return set.path + String(index + 1).padStart(set.pad, '0') + set.ext;
}

/** Hero beat sheet, copied from DESIGN.md hero.beats. */
export const BEATS = {
  titleHold: [0, 0.08],
  titleOut: [0.08, 0.14],
  film: [0.14, 0.86],
  arrivalHold: [0.86, 0.92],
  wordmarkIn: [0.86, 0.9],
  chromeOut: [0.86, 0.89],
  slideOut: [0.92, 1.0],
  enterOut: [0.92, 0.95],
} as const;
