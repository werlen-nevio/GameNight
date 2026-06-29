import type { HLCategory } from '../types';
import { HL_CATEGORIES_BASE } from './categories.base';
import { HL_CATEGORIES_EXTRA } from './categories.extra';

function dedupe(list: HLCategory[]): HLCategory[] {
  const seen = new Set<string>();
  return list.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

/** All Higher-or-Lower categories with at least 8 items (playable only). */
export const HL_CATEGORIES: HLCategory[] = dedupe([
  ...HL_CATEGORIES_BASE,
  ...HL_CATEGORIES_EXTRA,
]).filter((c) => c.items.length >= 8);
