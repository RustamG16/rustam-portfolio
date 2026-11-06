// Header tone: noir <-> cotton, driven by [data-theme] sections via ScrollTrigger (not IntersectionObserver:
// rootMargin flipped the theme ~135px early and left the header invisible at section boundaries).
// One trigger per themed section, from the header's centre line to the same line leaving: start "top 36px".
// Also: keeps the URL hash when switching language, and writes nothing to storage.
import { ScrollTrigger, type Env } from './env';

const CENTRE = 36; // half of the 72px header; the centre line used by start/end below

export function init(_env: Env): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  keepHashOnLangSwitch(header);

  const sections = Array.from(document.querySelectorAll<HTMLElement>('main [data-theme], footer[data-theme]')).filter(
    (el) => !header.contains(el),
  );
  if (!sections.length) return;

  const apply = (): void => {
    // Last section in DOM order that contains the centre line wins (the sheet overlaps the hero).
    let tone: string | undefined;
    for (const el of sections) {
      const r = el.getBoundingClientRect();
      if (r.top <= CENTRE && r.bottom > CENTRE) tone = el.dataset.theme;
    }
    if (tone && header.dataset.tone !== tone) header.dataset.tone = tone;
  };

  for (const el of sections) {
    ScrollTrigger.create({
      trigger: el,
      start: `top ${CENTRE}px`,
      end: `bottom ${CENTRE}px`,
      refreshPriority: -2,
      onToggle: apply,
      onRefresh: apply,
    });
  }
  apply();
}

function keepHashOnLangSwitch(scope: ParentNode): void {
  scope.querySelectorAll<HTMLAnchorElement>('a[data-keep-hash]').forEach((a) => {
    a.addEventListener('click', () => {
      if (location.hash) a.hash = location.hash;
    });
  });
}
