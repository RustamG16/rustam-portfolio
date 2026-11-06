// Typed copy loader. JSON is imported, so a missing key is a type error and a build-time undefined.
import en from '../content/copy.en.json';
import de from '../content/copy.de.json';
import facts from '../content/facts.json';
import { altPath, withBase, type Lang } from './paths';

export type { Lang } from './paths';
export type Copy = typeof en;

const COPY: Record<Lang, Copy> = { en, de: de as unknown as Copy };

/** Typed copy tree for a language. Every visible string comes from here. */
export function t(lang: Lang): Copy {
  return COPY[lang];
}

export function htmlLang(lang: Lang): string {
  return t(lang)._meta.htmlLang;
}

/** URL of the same page in the other language (base-aware). The hash is kept at click time via data-keep-hash. */
export function altHref(lang: Lang, path = ''): string {
  return withBase(altPath(lang, path));
}

export const FACTS = facts;

/** Pick the string for a language out of a { en, de } fact object. */
export function pick<T>(lang: Lang, v: { en: T; de: T }): T {
  return v[lang];
}

export function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'de';
}
