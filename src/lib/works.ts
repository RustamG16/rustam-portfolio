// Joins copy.works.items[id] with its facts.json entry and the media paths.
// Order always comes from copy.works.order, never from object key order.
import { t, FACTS, type Lang } from './i18n';
import { withBase } from './paths';

export interface Work {
  id: string;
  index: string;
  name: string;
  /** Archivo sector word, e.g. "Hospitality". */
  sector: string;
  /** Inter state label, e.g. "concept build". Never hidden at any breakpoint. */
  state: string;
  line: string;
  tags: string[];
  href: string;
  alt: string;
  film: string;
  poster: string;
}

export function works(lang: Lang): Work[] {
  const c = t(lang).works;
  const items = c.items as Record<string, { index: string; name: string; sector: string; line: string; tags: string[]; href: string; alt: string }>;
  return (c.order as string[]).map((id) => {
    const it = items[id];
    // "Studio · live" -> sector + state. Split on the first " · " only.
    const cut = it.sector.indexOf(' · ');
    const sector = cut < 0 ? it.sector : it.sector.slice(0, cut);
    const state = cut < 0 ? '' : it.sector.slice(cut + 3);
    const fact = (FACTS.works.items as { id: string; url: string }[]).find((w) => w.id === id);
    return {
      id,
      index: it.index,
      name: it.name,
      sector,
      state,
      line: it.line,
      tags: it.tags,
      href: fact?.url ?? it.href,
      alt: it.alt,
      film: withBase(`works/${id}/film.mp4`),
      poster: withBase(`works/${id}/poster.jpg`),
    };
  });
}
