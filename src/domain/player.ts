import { createId } from '../core/utils/id';
import {
  DEFAULT_EQUIPPED,
  DEFAULT_INVENTORY,
} from './cosmetics';

/** Lifetime statistics shown on the profile and feeding achievements. */
export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  correctAnswers: number;
  perfectRounds: number;
  dailyChallenges: number;
  coinsEarned: number;
  bestStreak: number;
  /** Distinct mode ids the player has tried (for the Explorer achievement). */
  modesPlayed: string[];
}

export interface PlayerInventory {
  avatars: string[];
  frames: string[];
  titles: string[];
  emotes: string[];
  themes: string[];
}

export interface PlayerEquipped {
  avatar: string;
  frame: string;
  title: string;
  theme: string;
}

/** Daily login streak state. */
export interface StreakState {
  count: number;
  /** dateKey of the last day a game/daily was completed. */
  lastActive: string | null;
}

/** The persisted player profile — the single account in this local-first build. */
export interface Player {
  id: string;
  name: string;
  createdAt: number;
  xp: number;
  coins: number;
  gems: number;
  inventory: PlayerInventory;
  equipped: PlayerEquipped;
  stats: PlayerStats;
  streak: StreakState;
  /** achievementId -> whether its reward has been granted. */
  unlockedAchievements: string[];
}

export function createDefaultPlayer(name = 'Spieler'): Player {
  return {
    id: createId(),
    name,
    createdAt: Date.now(),
    xp: 0,
    coins: 500,
    gems: 20,
    inventory: {
      avatars: [...DEFAULT_INVENTORY.avatars],
      frames: [...DEFAULT_INVENTORY.frames],
      titles: [...DEFAULT_INVENTORY.titles],
      emotes: [...DEFAULT_INVENTORY.emotes],
      themes: [...DEFAULT_INVENTORY.themes],
    },
    equipped: { ...DEFAULT_EQUIPPED },
    stats: {
      gamesPlayed: 0,
      wins: 0,
      correctAnswers: 0,
      perfectRounds: 0,
      dailyChallenges: 0,
      coinsEarned: 0,
      bestStreak: 0,
      modesPlayed: [],
    },
    streak: { count: 0, lastActive: null },
    unlockedAchievements: [],
  };
}
