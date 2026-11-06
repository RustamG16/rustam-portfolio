// CV jump rail: which section is under the reading line. State feedback, not an effect (DESIGN.md Motion).
// One ScrollTrigger per target section (no IntersectionObserver: it is unreliable in some preview panes).
import { ScrollTrigger, type Env } from '../env';

export function init(_env: Env): void {
  const nav = document.querySelector<HTMLElement>('[data-cv-spine]');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
  const byId = new Map<string, HTMLAnchorElement>();
  links.forEach((a) => byId.set(a.hash.slice(1), a));

  let current = '';
  const set = (id: string): void => {
    if (id === current) return;
    current = id;
    links.forEach((a) => {
      const on = a.hash.slice(1) === id;
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    // keep the active item in view on the phone strip (horizontal scroll, never the page)
    const active = byId.get(id);
    const strip = nav.querySelector<HTMLElement>('[data-spine-list]');
    if (active && strip && strip.scrollWidth > strip.clientWidth) {
      const left = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
      strip.scrollTo({ left, behavior: 'auto' });
    }
  };

  for (const [id] of byId) {
    const section = document.getElementById(id);
    if (!section) continue;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 45%',
      end: 'bottom 45%',
      refreshPriority: 2,
      onToggle: (self) => {
        if (self.isActive) set(id);
      },
    });
  }
}
