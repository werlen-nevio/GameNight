import { Rng } from '../../../core/utils/random';
import { PRIZE_LADDER, SAFE_HAVENS, type MillionaireQuestion, type QuizTier } from './types';

/** Prize banked if the player walks away *before* answering question `index`. */
export function bankedPrize(index: number): number {
  return index > 0 ? PRIZE_LADDER[index - 1] : 0;
}

/** Guaranteed prize kept if the player answers question `index` wrong. */
export function safeFloor(index: number): number {
  let floor = 0;
  for (const sh of SAFE_HAVENS) if (sh < index) floor = PRIZE_LADDER[sh];
  return floor;
}

/** Confidence the audience/phone joker has, by question tier. */
const TIER_CONFIDENCE: Record<QuizTier, number> = { easy: 0.88, medium: 0.72, hard: 0.55 };

/** Generates a plausible audience vote distribution (percentages, sum 100). */
export function audienceVote(
  q: MillionaireQuestion,
  available: number[],
  rng: Rng,
): Record<number, number> {
  const conf = TIER_CONFIDENCE[q.tier];
  const weights: Record<number, number> = {};
  for (const i of available) {
    if (i === q.correct) weights[i] = conf * 100 + rng.int(0, 12);
    else weights[i] = (1 - conf) * 40 * rng.float() + rng.int(2, 10);
  }
  const sum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const out: Record<number, number> = {};
  let acc = 0;
  available.forEach((i, idx) => {
    if (idx === available.length - 1) out[i] = 100 - acc;
    else {
      out[i] = Math.round((weights[i] / sum) * 100);
      acc += out[i];
    }
  });
  return out;
}

/** The phone-a-friend hint: a letter + a confidence-flavored German line. */
export function phoneHint(q: MillionaireQuestion, available: number[], rng: Rng): { pick: number; text: string } {
  const conf = TIER_CONFIDENCE[q.tier];
  const correctGuess = rng.chance(conf);
  const letters = ['A', 'B', 'C', 'D'];
  let pick: number = q.correct;
  if (!correctGuess) {
    const wrong = available.filter((i) => i !== q.correct);
    pick = wrong.length ? rng.pick(wrong)! : q.correct;
  }
  const sure = correctGuess
    ? ['Ganz sicher', 'Da bin ich mir sehr sicher', 'Definitiv'][rng.int(0, 2)]
    : ['Ich glaube', 'Bin nicht ganz sicher, aber', 'Vielleicht'][rng.int(0, 2)];
  return { pick, text: `${sure}: Antwort ${letters[pick]}.` };
}

/** Picks two wrong answers to remove for the 50:50 joker. */
export function fiftyFiftyRemovals(q: MillionaireQuestion, rng: Rng): number[] {
  const wrong = [0, 1, 2, 3].filter((i) => i !== q.correct);
  return rng.sample(wrong, 2);
}

export { PRIZE_LADDER };
