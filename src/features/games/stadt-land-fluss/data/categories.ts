import type { SlfCategory } from '../types';
import { SLF_CATEGORIES_BASE } from './categories.base';
import { SLF_CATEGORIES_EXTRA } from './categories.extra';

/** Deduplicates by id, keeping the first occurrence (base wins over extra). */
function dedupe(list: SlfCategory[]): SlfCategory[] {
  const seen = new Set<string>();
  const out: SlfCategory[] = [];
  for (const c of list) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

/** The complete category catalogue used across the mode. */
export const SLF_CATEGORIES: SlfCategory[] = dedupe([
  ...SLF_CATEGORIES_BASE,
  ...SLF_CATEGORIES_EXTRA,
]);

export const SLF_CATEGORY_BY_ID: Record<string, SlfCategory> = Object.fromEntries(
  SLF_CATEGORIES.map((c) => [c.id, c]),
);
