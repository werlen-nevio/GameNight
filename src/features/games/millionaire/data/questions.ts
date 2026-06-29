import type { MillionaireQuestion, QuizTier } from '../types';
import { Rng } from '../../../../core/utils/random';
import { MILLIONAIRE_BASE } from './questions.base';
import { MILLIONAIRE_EXTRA } from './questions.extra';

function dedupe(list: MillionaireQuestion[]): MillionaireQuestion[] {
  const seen = new Set<string>();
  return list.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)));
}

export const MILLIONAIRE_QUESTIONS: MillionaireQuestion[] = dedupe([
  ...MILLIONAIRE_BASE,
  ...MILLIONAIRE_EXTRA,
]);

const BY_TIER: Record<QuizTier, MillionaireQuestion[]> = {
  easy: MILLIONAIRE_QUESTIONS.filter((q) => q.tier === 'easy'),
  medium: MILLIONAIRE_QUESTIONS.filter((q) => q.tier === 'medium'),
  hard: MILLIONAIRE_QUESTIONS.filter((q) => q.tier === 'hard'),
};

/**
 * Builds a 15-question ladder of rising difficulty (5 easy → 5 medium → 5 hard),
 * drawn without repetition. Falls back across tiers if a tier is short. `seed`
 * makes the Daily Challenge deterministic.
 */
export function buildLadder(seed?: string): MillionaireQuestion[] {
  const rng = new Rng(seed);
  const plan: QuizTier[] = [
    ...Array(5).fill('easy'),
    ...Array(5).fill('medium'),
    ...Array(5).fill('hard'),
  ] as QuizTier[];

  const pools: Record<QuizTier, MillionaireQuestion[]> = {
    easy: rng.shuffle(BY_TIER.easy),
    medium: rng.shuffle(BY_TIER.medium),
    hard: rng.shuffle(BY_TIER.hard),
  };
  const order: QuizTier[] = ['easy', 'medium', 'hard'];
  const used = new Set<string>();

  return plan.map((tier) => {
    // Try the planned tier, then progressively harder/available tiers.
    for (const t of [tier, ...order.filter((o) => o !== tier)]) {
      const pick = pools[t].find((q) => !used.has(q.id));
      if (pick) {
        used.add(pick.id);
        return pick;
      }
    }
    // As a last resort, allow a repeat (only if the bank is tiny).
    return pools[tier][0] ?? MILLIONAIRE_QUESTIONS[0];
  });
}
