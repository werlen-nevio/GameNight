/**
 * Progression math: a single, tunable XP curve plus the rewards and rank titles
 * derived from it. All XP/level logic in the app funnels through here so the
 * economy stays balanced and consistent.
 */

export const MAX_LEVEL = 200;

/** XP required to advance *from* `level` to `level + 1`. Smooth quadratic ramp. */
export function xpForLevel(level: number): number {
  const l = Math.max(1, level);
  return Math.round(100 + (l - 1) * 55 + Math.pow(l - 1, 1.8) * 9);
}

export interface LevelInfo {
  level: number;
  /** XP accumulated within the current level. */
  xpIntoLevel: number;
  /** XP needed to complete the current level. */
  xpForThisLevel: number;
  /** 0..1 progress toward the next level. */
  progress: number;
  totalXp: number;
  isMax: boolean;
}

/** Resolves a total XP value into level + progress. */
export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (level < MAX_LEVEL) {
    const need = xpForLevel(level);
    if (remaining < need) {
      return {
        level,
        xpIntoLevel: remaining,
        xpForThisLevel: need,
        progress: need > 0 ? remaining / need : 1,
        totalXp,
        isMax: false,
      };
    }
    remaining -= need;
    level += 1;
  }
  return {
    level: MAX_LEVEL,
    xpIntoLevel: 0,
    xpForThisLevel: 0,
    progress: 1,
    totalXp,
    isMax: true,
  };
}

export interface LevelReward {
  coins: number;
  gems: number;
  /** Cosmetic unlocks granted at this level, if any. */
  unlocks: { kind: 'avatar' | 'frame' | 'title' | 'emote' | 'theme'; id: string }[];
}

/** Reward for *reaching* a given level. Milestone levels grant gems + cosmetics. */
export function rewardForLevel(level: number): LevelReward {
  const coins = 40 + level * 15;
  const milestone = level % 5 === 0;
  const bigMilestone = level % 10 === 0;
  const unlocks: LevelReward['unlocks'] = [];

  if (level === 3) unlocks.push({ kind: 'avatar', id: 'av_robot' });
  if (level === 5) unlocks.push({ kind: 'frame', id: 'fr_ocean' });
  if (level === 8) unlocks.push({ kind: 'emote', id: 'em_fire' });
  if (level === 10) unlocks.push({ kind: 'title', id: 'ti_quizmaster' });
  if (level === 15) unlocks.push({ kind: 'avatar', id: 'av_ninja' });
  if (level === 20) unlocks.push({ kind: 'theme', id: 'th_aqua' });
  if (level === 25) unlocks.push({ kind: 'frame', id: 'fr_violet' });
  if (level === 50) unlocks.push({ kind: 'title', id: 'ti_legend' });

  return {
    coins,
    gems: bigMilestone ? 25 : milestone ? 10 : 0,
    unlocks,
  };
}

export interface Rank {
  title: string;
  minLevel: number;
  color: string;
}

/** Named rank tiers shown on the profile and leaderboards. */
export const RANKS: Rank[] = [
  { title: 'Neuling', minLevel: 1, color: '#9A92B8' },
  { title: 'Aufsteiger', minLevel: 5, color: '#7C8499' },
  { title: 'Profi', minLevel: 10, color: '#3B82F6' },
  { title: 'Veteran', minLevel: 20, color: '#22E0D6' },
  { title: 'Meister', minLevel: 35, color: '#9D5CFF' },
  { title: 'Großmeister', minLevel: 55, color: '#FF4D8D' },
  { title: 'Champion', minLevel: 80, color: '#FF8A3D' },
  { title: 'Legende', minLevel: 120, color: '#FFD23F' },
];

export function rankForLevel(level: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) if (level >= r.minLevel) current = r;
  return current;
}

/** Standard XP payouts so every mode rewards play on the same scale. */
export const XP_REWARDS = {
  played: 20,
  win: 60,
  perfect: 40,
  correctAnswer: 8,
  fastBonus: 5,
  dailyChallenge: 120,
} as const;
