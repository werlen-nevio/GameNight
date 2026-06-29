/** Difficulty tiers for the 15-question ladder. */
export type QuizTier = 'easy' | 'medium' | 'hard';

/** A single multiple-choice question. `correct` indexes into `answers`. */
export interface MillionaireQuestion {
  id: string;
  question: string;
  answers: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  tier: QuizTier;
  category?: string;
}

/** The classic prize ladder (€). Index 0 = question 1. */
export const PRIZE_LADDER = [
  50, 100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 500000, 1000000,
] as const;

/** Guaranteed "safe haven" rungs (question indices, 0-based: Q5 and Q10). */
export const SAFE_HAVENS = [4, 9] as const;
