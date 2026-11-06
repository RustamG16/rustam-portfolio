// Every internal URL goes through withBase(). No hardcoded "/" paths anywhere in src/.
// The same build works on Pages (/rustam-portfolio/) and, after scripts/relativize.mjs, from disk.

export const SITE_ORIGIN = 'https://rustamg16.github.io';
/** The public base, always. Canonical, hreflang, OG and the 404 back link never follow the file build. */
export const PUBLIC_BASE = '/rustam-portfolio/';

const BASE: string = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';

/** withBase('cv/') -> '/rustam-portfolio/cv/' (or '/cv/' in the file build, relativized afterwards). */
export function withBase(path = ''): string {
  return BASE + path.replace(/^\/+/, '');
}

/** Absolute public URL for a site path, independent of the build flavour. */
export function absUrl(path = ''): string {
  return SITE_ORIGIN + PUBLIC_BASE + path.replace(/^\/+/, '');
}

export type Lang = 'en' | 'de';
export type Page = 'home' | 'cv' | 'legal';

/** Route path (no base) of a page in a language: routePath('de', 'cv/') -> 'de/cv/'. */
export function routePath(lang: Lang, path = ''): string {
  return (lang === 'de' ? 'de/' : '') + path;
}

/** Same page in the other language. */
export function altPath(lang: Lang, path = ''): string {
  return routePath(lang === 'en' ? 'de' : 'en', path);
}
