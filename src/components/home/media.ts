// Build-time media slots. A portrait renders as <img> only if its file exists in public/ when the site is built;
// otherwise the component draws a token-coloured block with the exact aspect. Never a runtime fetch, never a 404.
// Phase 4 names the files p1-engineer / p2-orchestrate / p3-design / p4-cv (+ "-phone" 4:3 crops); the plain
// p1 / p2 / p3 / cv names from the phase brief are accepted too, so either delivery lights the slot.
import fs from 'node:fs';
import path from 'node:path';
import { withBase } from '../../lib/paths';

const PUBLIC = path.resolve(process.cwd(), 'public');
const exists = (rel: string): boolean => {
  try {
    return fs.existsSync(path.join(PUBLIC, rel));
  } catch {
    return false;
  }
};

const NAMES: Record<string, string[]> = {
  engineer: ['p1-engineer', 'p1'],
  orchestrate: ['p2-orchestrate', 'p2'],
  design: ['p3-design', 'p3'],
  cv: ['p4-cv', 'cv'],
};

export interface Portrait {
  src: string;
  /** 4:3 phone crop, when delivered. */
  phone?: string;
}

export function portrait(slot: 'engineer' | 'orchestrate' | 'design' | 'cv'): Portrait | null {
  for (const base of NAMES[slot]) {
    const rel = `media/portraits/${base}.webp`;
    if (!exists(rel)) continue;
    const phoneRel = `media/portraits/${base}-phone.webp`;
    return { src: withBase(rel), phone: exists(phoneRel) ? withBase(phoneRel) : undefined };
  }
  return null;
}
