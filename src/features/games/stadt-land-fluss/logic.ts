import { Rng } from '../../../core/utils/random';
import type { Difficulty, GamePlayer } from '../../../domain';
import type { SlfCategory, SlfPack } from './types';
import { SLF_CATEGORIES } from './data/categories';

/** Letters used for rounds — excludes near-impossible ones (Q, X, Y). */
const LETTER_POOL = 'ABDEFGHIKLMNOPRSTUVWZ'.split('');

/** How forgiving filling a category is, per category difficulty (bot model). */
const CAT_DIFFICULTY_FACTOR: Record<Difficulty, number> = {
  easy: 1,
  medium: 0.85,
  hard: 0.62,
  expert: 0.45,
};

export interface SlfRound {
  letter: string;
  categories: SlfCategory[];
}

/** Normalizes an answer for comparison (trim, lowercase, strip leading article). */
export function normalizeAnswer(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^(der|die|das|ein|eine|the)\s+/i, '')
    .replace(/\s+/g, ' ');
}

/** First alphabetic character of an answer, uppercased (or ''). */
function firstLetter(raw: string): string {
  const m = normalizeAnswer(raw).match(/[a-zäöü]/i);
  return m ? m[0].toUpperCase() : '';
}

/** A non-empty answer whose first letter matches the round letter. */
export function isValidAnswer(raw: string, letter: string): boolean {
  if (!raw.trim()) return false;
  return firstLetter(raw) === letter.toUpperCase();
}

/** Picks the categories for a game from the enabled packs, difficulty-aware. */
export function pickCategories(opts: {
  count: number;
  packs: SlfPack[] | 'all';
  difficulty: Difficulty;
  rng: Rng;
}): SlfCategory[] {
  const { count, packs, difficulty, rng } = opts;
  let pool = SLF_CATEGORIES;
  if (packs !== 'all') {
    const set = new Set(packs);
    const filtered = pool.filter((c) => set.has(c.pack));
    if (filtered.length >= count) pool = filtered;
  }
  // Bias toward categories at or below the chosen difficulty for fairness.
  const order: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
  const maxIdx = order.indexOf(difficulty);
  const preferred = pool.filter((c) => order.indexOf(c.difficulty) <= maxIdx);
  const source = preferred.length >= count ? preferred : pool;
  return rng.sample(source, count);
}

/** Builds `rounds` rounds, each with a fresh letter + the chosen categories. */
export function buildRounds(opts: {
  rounds: number;
  categories: SlfCategory[];
  rng: Rng;
}): SlfRound[] {
  const { rounds, categories, rng } = opts;
  const letters = rng.shuffle(LETTER_POOL);
  return Array.from({ length: rounds }, (_, i) => ({
    letter: letters[i % letters.length],
    categories,
  }));
}

export interface CategoryScoreLine {
  categoryId: string;
  /** playerId -> { answer, points, valid } */
  results: Record<string, { answer: string; points: number; valid: boolean }>;
}

export interface RoundScore {
  byPlayer: Record<string, number>;
  lines: CategoryScoreLine[];
}

/**
 * The automatic scoring engine for a round.
 *
 * Per category, among players with a *valid* answer (right starting letter):
 *  - sole answerer            → 20 pts
 *  - unique answer (no twins) → 10 pts
 *  - duplicated answer        →  5 pts (shared with the twins)
 * Bots are simulated answerers: each fills a category with a skill-and-
 * difficulty-derived probability and scores a flat 10 when they do.
 */
export function scoreRound(
  round: SlfRound,
  humanAnswers: Record<string, Record<string, string>>,
  players: GamePlayer[],
  rng: Rng,
): RoundScore {
  const byPlayer: Record<string, number> = {};
  players.forEach((p) => (byPlayer[p.id] = 0));
  const lines: CategoryScoreLine[] = [];

  const bots = players.filter((p) => p.isBot);
  const humans = players.filter((p) => !p.isBot);

  for (const cat of round.categories) {
    const line: CategoryScoreLine = { categoryId: cat.id, results: {} };

    // Collect valid human answers + a normalized-frequency map.
    const valid: { id: string; norm: string; answer: string }[] = [];
    const freq = new Map<string, number>();
    for (const h of humans) {
      const ans = humanAnswers[h.id]?.[cat.id] ?? '';
      const ok = isValidAnswer(ans, round.letter);
      if (ok) {
        const norm = normalizeAnswer(ans);
        valid.push({ id: h.id, norm, answer: ans.trim() });
        freq.set(norm, (freq.get(norm) ?? 0) + 1);
      } else {
        line.results[h.id] = { answer: ans.trim(), points: 0, valid: false };
      }
    }

    // Simulate bot answers.
    const botAnswered: string[] = [];
    for (const b of bots) {
      const p = (b.botSkill ?? 0.7) * CAT_DIFFICULTY_FACTOR[cat.difficulty];
      const answered = rng.chance(Math.min(0.95, p));
      if (answered) botAnswered.push(b.id);
    }

    const totalAnswerers = valid.length + botAnswered.length;

    // Score humans.
    for (const v of valid) {
      const dup = (freq.get(v.norm) ?? 1) > 1;
      const points = dup ? 5 : totalAnswerers === 1 ? 20 : 10;
      byPlayer[v.id] += points;
      line.results[v.id] = { answer: v.answer, points, valid: true };
    }
    // Score bots (flat 10).
    for (const bid of botAnswered) {
      byPlayer[bid] += 10;
      line.results[bid] = { answer: '✓', points: 10, valid: true };
    }
    for (const b of bots) {
      if (!line.results[b.id]) line.results[b.id] = { answer: '—', points: 0, valid: false };
    }

    lines.push(line);
  }

  return { byPlayer, lines };
}

/** Maps a chosen difficulty to a per-round time limit (seconds). */
export function timeForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 90;
    case 'medium':
      return 70;
    case 'hard':
      return 55;
    case 'expert':
      return 40;
  }
}
