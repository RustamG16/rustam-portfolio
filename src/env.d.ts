/// <reference types="astro/client" />

interface Window {
  __lenis?: import('lenis').default;
  __scrubber?: {
    count: number;
    loaded: Set<number>;
    displayIdx: number;
    painted: number;
  };
}
