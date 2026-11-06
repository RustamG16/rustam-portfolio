// Effect 3 of 3: the works float preview (DESIGN.md components.float-preview, architecture.md 8.2).
// One shared 320x400 frame follows the pointer's Y beside the list (lerp 0.14), opens with a 0.78 s clip-path and
// plays the hovered row's film.mp4 muted; leaving closes it in 0.24 s and pauses.
//
// Rules learned the hard way (memory lab-000-portfolio-work-previews), all kept:
//  - data-float on [data-works] is the ARM SWITCH: "armed" only on fine pointer + >= 960 px. Every handler checks it.
//  - poster first (webp, preloaded once); the film is attached on first hover only (preload="none" until then).
//  - a generation token + a show-layer attribute: a late `playing` from a previous row can never light the video layer.
//  - never read readyState right after setting currentTime: the film is shown from the `playing` event only.
//  - no IntersectionObserver: pointer and focus events only.
//  - keyboard focus (:focus-visible) shows the poster and never plays a film. Reduced motion: poster only, no clip tween.
import { gsap, type Env } from '../env';

const W = 320;
const H = 400;
const LERP = 0.14;
const OPEN_S = 0.78;
const CLOSE_S = 0.24;
const CLIP_SHUT = 'inset(100% 0% 0% 0%)';
const CLIP_OPEN = 'inset(0% 0% 0% 0%)';

export function init(env: Env): void {
  const works = document.querySelector<HTMLElement>('[data-works]');
  const list = works?.querySelector<HTMLElement>('[data-works-list]');
  if (!works || !list) return;
  const rows = Array.from(list.querySelectorAll<HTMLAnchorElement>('a[data-work]'));
  if (!rows.length) return;

  const mq = window.matchMedia('(min-width: 960px) and (hover: hover) and (pointer: fine)');
  const armed = (): boolean => works.dataset.float === 'armed';

  let float: HTMLDivElement | null = null;
  let poster: HTMLImageElement;
  let film: HTMLVideoElement;
  const posters = new Map<string, HTMLImageElement>();

  let gen = 0; // generation token: bumped on every enter / leave
  let opened = false; // clip-path is open (or opening)
  let live = false; // the ticker has something to move
  let cx = 0;
  let cy = 0;
  let tx = 0;
  let ty = 0;
  let listRight = 0;
  let intent = 0; // timer: the film is requested only if the pointer rests on a row (passing over rows costs nothing)

  const build = (): void => {
    if (float) return;
    float = document.createElement('div');
    float.className = 'wfloat';
    float.setAttribute('aria-hidden', 'true');
    float.dataset.film = 'off';
    poster = document.createElement('img');
    poster.className = 'wfloat__poster';
    poster.alt = '';
    poster.decoding = 'async';
    film = document.createElement('video');
    film.className = 'wfloat__film';
    film.muted = true;
    film.loop = true;
    film.playsInline = true;
    film.preload = 'none';
    film.disablePictureInPicture = true;
    film.setAttribute('muted', '');
    film.setAttribute('tabindex', '-1');
    // The film layer is lit only by the generation that asked for it.
    film.addEventListener('playing', () => {
      if (float && film.dataset.gen === String(gen) && opened) float.dataset.film = 'on';
    });
    film.addEventListener('error', () => {
      if (float) float.dataset.film = 'off'; // film missing: the poster stays, the row still links
    });
    float.append(poster, film);
    document.body.append(float);
    gsap.set(float, { clipPath: CLIP_SHUT });
    gsap.ticker.add(tick);
  };

  const preloadPosters = (): void => {
    if (posters.size) return;
    rows.forEach((r) => {
      const src = r.dataset.poster;
      if (!src || !r.dataset.work) return;
      const im = new Image();
      im.decoding = 'async';
      im.src = src;
      posters.set(r.dataset.work, im);
    });
  };

  const measure = (): void => {
    listRight = list.getBoundingClientRect().right;
    tx = Math.max(8, Math.min(listRight - W, window.innerWidth - W - 8));
  };

  const clampY = (y: number): number => {
    const top = (document.querySelector('[data-header]')?.getBoundingClientRect().bottom ?? 0) + 8; // never over the header
    return Math.max(top, Math.min(y - H / 2, window.innerHeight - H - 8));
  };

  function tick(_t: number, dt: number): void {
    try {
      if (!live || !float) return;
      const k = 1 - Math.pow(1 - LERP, Math.max(0.5, dt / 16.667)); // frame-rate independent lerp 0.14
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      float.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
    } catch (err) {
      console.error('[float-preview]', err);
    }
  }

  const open = (): void => {
    if (!float) return;
    if (!opened) {
      cx = tx; // never fly in from the corner
      cy = ty;
      float.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    }
    opened = true;
    live = true;
    gsap.killTweensOf(float);
    if (env.reduced) gsap.set(float, { clipPath: CLIP_OPEN });
    else gsap.to(float, { clipPath: CLIP_OPEN, duration: OPEN_S, ease: 'expo.out' });
  };

  const close = (immediate = false): void => {
    gen++;
    window.clearTimeout(intent);
    rows.forEach((r) => r.classList.remove('is-active'));
    if (!float) return;
    float.dataset.film = 'off';
    film.pause();
    try {
      film.currentTime = 0;
    } catch {
      /* no source yet */
    }
    opened = false;
    gsap.killTweensOf(float);
    gsap.to(float, {
      clipPath: CLIP_SHUT,
      duration: immediate || env.reduced ? 0 : CLOSE_S,
      ease: 'expo.out',
      onComplete: () => {
        if (!opened) live = false;
      },
    });
  };

  const enter = (row: HTMLAnchorElement, withFilm: boolean): void => {
    build();
    if (!float) return;
    const id = row.dataset.work ?? '';
    gen++;
    const g = gen;
    rows.forEach((r) => r.classList.toggle('is-active', r === row));

    // Poster first, film layer dark until this generation's `playing` event.
    float.dataset.film = 'off';
    film.pause();
    const url = row.dataset.poster ?? '';
    if (url && poster.getAttribute('src') !== url && poster.dataset.id !== id) {
      poster.src = url;
      poster.dataset.id = id;
    }
    open();

    window.clearTimeout(intent);
    if (!withFilm || env.reduced) return;
    const src = row.dataset.film;
    if (!src) return;
    intent = window.setTimeout(() => {
      if (g !== gen) return; // the pointer moved on
      film.dataset.gen = String(g);
      if (film.dataset.id !== id) {
        film.dataset.id = id;
        film.src = src; // first rest on this row: now (and only now) the film is requested
      } else {
        film.currentTime = 0;
      }
      const p = film.play();
      if (p) p.catch(() => undefined); // aborted by a newer row, or autoplay refused: the poster stays
    }, 160);
  };

  const sync = (): void => {
    const on = mq.matches;
    works.dataset.float = on ? 'armed' : 'off';
    if (on) measure();
    else close(true);
  };
  mq.addEventListener('change', sync);
  window.addEventListener('resize', () => {
    if (armed()) measure();
  });
  sync();

  const firstUse = (): void => {
    preloadPosters();
    build();
  };

  rows.forEach((row) => {
    row.addEventListener('pointerenter', (e) => {
      if (!armed() || e.pointerType === 'touch') return;
      firstUse();
      measure();
      ty = clampY(e.clientY);
      enter(row, true);
    });
    row.addEventListener('pointerleave', () => row.classList.remove('is-active'));
  });

  list.addEventListener(
    'pointermove',
    (e) => {
      if (!armed() || e.pointerType === 'touch') return;
      ty = clampY(e.clientY);
    },
    { passive: true },
  );
  list.addEventListener('pointerleave', () => {
    if (armed()) close();
  });

  // Keyboard: focusing a row shows its poster beside it, never a film.
  list.addEventListener('focusin', (e) => {
    if (!armed()) return;
    const row = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-work]');
    if (!row || !row.matches(':focus-visible')) return;
    firstUse();
    measure();
    const r = row.getBoundingClientRect();
    ty = clampY(r.top + r.height / 2);
    if (!opened) {
      cy = ty;
    }
    enter(row, false);
  });
  list.addEventListener('focusout', (e) => {
    if (!armed()) return;
    const next = e.relatedTarget as Node | null;
    if (next && list.contains(next)) return;
    close();
  });
}
