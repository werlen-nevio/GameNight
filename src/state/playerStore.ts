import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '../core/services/storage/storage';
import { dateKey } from '../core/utils/format';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  createDefaultPlayer,
  levelFromXp,
  rewardForLevel,
  XP_REWARDS,
  type AchievementStat,
  type CosmeticKind,
  type LevelInfo,
  type Player,
  type ShopItem,
} from '../domain';

/** A cosmetic unlock surfaced to the UI after a match or purchase. */
export interface UnlockedCosmetic {
  kind: CosmeticKind;
  id: string;
}

/** Everything the post-match results screen needs to celebrate. */
export interface MatchSummary {
  xpGained: number;
  coinsGained: number;
  gemsGained: number;
  leveledUp: boolean;
  fromLevel: number;
  toLevel: number;
  unlockedAchievements: string[];
  unlockedCosmetics: UnlockedCosmetic[];
}

interface RecordMatchInput {
  modeId: string;
  won: boolean;
  correctAnswers?: number;
  perfect?: boolean;
  isDaily?: boolean;
}

interface PlayerState {
  player: Player;
  hydrated: boolean;

  level: () => LevelInfo;

  /** Applies the full outcome of a finished match and returns a summary. */
  recordMatch: (input: RecordMatchInput) => MatchSummary;
  /** Buys a shop item if affordable; returns success. */
  purchase: (item: ShopItem) => boolean;
  /** Equips an owned cosmetic of the given kind. */
  equip: (kind: CosmeticKind, id: string) => void;
  /** Grants a cosmetic for free (rewards, achievements). */
  grantCosmetic: (kind: CosmeticKind, id: string) => void;
  rename: (name: string) => void;
  addCurrency: (coins: number, gems?: number) => void;
  resetProgress: () => void;
  _setHydrated: () => void;
}

const equipKey: Record<CosmeticKind, keyof Player['equipped']> = {
  avatar: 'avatar',
  frame: 'frame',
  title: 'title',
  theme: 'theme',
  emote: 'avatar', // emotes aren't "equipped" singularly; never used for equip
};

const inventoryKey: Record<CosmeticKind, keyof Player['inventory']> = {
  avatar: 'avatars',
  frame: 'frames',
  title: 'titles',
  emote: 'emotes',
  theme: 'themes',
};

function statValue(player: Player, stat: AchievementStat): number {
  switch (stat) {
    case 'modesPlayed':
      return player.stats.modesPlayed.length;
    case 'level':
      return levelFromXp(player.xp).level;
    default:
      return player.stats[stat];
  }
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      player: createDefaultPlayer(),
      hydrated: false,

      level: () => levelFromXp(get().player.xp),

      recordMatch: ({ modeId, won, correctAnswers = 0, perfect = false, isDaily = false }) => {
        const before = get().player;
        const fromLevel = levelFromXp(before.xp).level;

        // --- earnings ---------------------------------------------------
        let xpGained =
          XP_REWARDS.played +
          (won ? XP_REWARDS.win : 0) +
          correctAnswers * XP_REWARDS.correctAnswer +
          (perfect ? XP_REWARDS.perfect : 0) +
          (isDaily ? XP_REWARDS.dailyChallenge : 0);
        let coinsGained =
          20 + (won ? 40 : 0) + correctAnswers * 4 + (perfect ? 30 : 0) + (isDaily ? 80 : 0);
        let gemsGained = 0;
        const unlockedCosmetics: UnlockedCosmetic[] = [];

        // --- level-up rewards across every level crossed ----------------
        const newXp = before.xp + xpGained;
        const toLevel = levelFromXp(newXp).level;
        for (let lvl = fromLevel + 1; lvl <= toLevel; lvl++) {
          const reward = rewardForLevel(lvl);
          coinsGained += reward.coins;
          gemsGained += reward.gems;
          reward.unlocks.forEach((u) => unlockedCosmetics.push(u));
        }

        // --- streak -----------------------------------------------------
        const today = dateKey();
        const streak = { ...before.streak };
        if (streak.lastActive !== today) {
          const yesterday = dateKey(new Date(Date.now() - 86400000));
          streak.count = streak.lastActive === yesterday ? streak.count + 1 : 1;
          streak.lastActive = today;
        }

        // --- stats ------------------------------------------------------
        const modesPlayed = before.stats.modesPlayed.includes(modeId)
          ? before.stats.modesPlayed
          : [...before.stats.modesPlayed, modeId];

        const stats: Player['stats'] = {
          gamesPlayed: before.stats.gamesPlayed + 1,
          wins: before.stats.wins + (won ? 1 : 0),
          correctAnswers: before.stats.correctAnswers + correctAnswers,
          perfectRounds: before.stats.perfectRounds + (perfect ? 1 : 0),
          dailyChallenges: before.stats.dailyChallenges + (isDaily ? 1 : 0),
          coinsEarned: before.stats.coinsEarned + coinsGained,
          bestStreak: Math.max(before.stats.bestStreak, streak.count),
          modesPlayed,
        };

        // Build the interim player to evaluate achievements against.
        let next: Player = {
          ...before,
          xp: newXp,
          coins: before.coins + coinsGained,
          gems: before.gems + gemsGained,
          stats,
          streak,
        };

        // --- achievements ----------------------------------------------
        const unlockedAchievements: string[] = [];
        for (const ach of ACHIEVEMENTS) {
          if (next.unlockedAchievements.includes(ach.id)) continue;
          if (statValue(next, ach.stat) >= ach.goal) {
            unlockedAchievements.push(ach.id);
            next = {
              ...next,
              coins: next.coins + ach.reward.coins,
              gems: next.gems + ach.reward.gems,
              unlockedAchievements: [...next.unlockedAchievements, ach.id],
            };
            coinsGained += ach.reward.coins;
            gemsGained += ach.reward.gems;
          }
        }

        // Apply granted cosmetic unlocks to inventory.
        for (const u of unlockedCosmetics) {
          const key = inventoryKey[u.kind];
          if (!next.inventory[key].includes(u.id)) {
            next = {
              ...next,
              inventory: { ...next.inventory, [key]: [...next.inventory[key], u.id] },
            };
          }
        }

        // Fold the *final* coin gains (incl. achievement payouts) into the
        // lifetime stat so it never undercounts.
        next = {
          ...next,
          stats: { ...next.stats, coinsEarned: before.stats.coinsEarned + coinsGained },
        };

        set({ player: next });

        return {
          xpGained,
          coinsGained,
          gemsGained,
          leveledUp: toLevel > fromLevel,
          fromLevel,
          toLevel,
          unlockedAchievements,
          unlockedCosmetics,
        };
      },

      purchase: (item) => {
        const p = get().player;
        const balance = item.currency === 'gems' ? p.gems : p.coins;
        if (balance < item.price) return false;
        const key = inventoryKey[item.kind];
        if (p.inventory[key].includes(item.cosmeticId)) return false;
        set({
          player: {
            ...p,
            coins: item.currency === 'coins' ? p.coins - item.price : p.coins,
            gems: item.currency === 'gems' ? p.gems - item.price : p.gems,
            inventory: { ...p.inventory, [key]: [...p.inventory[key], item.cosmeticId] },
          },
        });
        return true;
      },

      equip: (kind, id) => {
        if (kind === 'emote') return; // emotes are a loadout, not a single slot
        const p = get().player;
        const key = inventoryKey[kind];
        if (!p.inventory[key].includes(id)) return;
        set({ player: { ...p, equipped: { ...p.equipped, [equipKey[kind]]: id } } });
      },

      grantCosmetic: (kind, id) => {
        const p = get().player;
        const key = inventoryKey[kind];
        if (p.inventory[key].includes(id)) return;
        set({
          player: { ...p, inventory: { ...p.inventory, [key]: [...p.inventory[key], id] } },
        });
      },

      rename: (name) => {
        const trimmed = name.trim().slice(0, 16);
        if (!trimmed) return;
        set({ player: { ...get().player, name: trimmed } });
      },

      addCurrency: (coins, gems = 0) => {
        const p = get().player;
        set({ player: { ...p, coins: p.coins + coins, gems: p.gems + gems } });
      },

      resetProgress: () => set({ player: createDefaultPlayer(get().player.name) }),

      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'player',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ player: state.player }),
      onRehydrateStorage: () => (state) => state?._setHydrated(),
    },
  ),
);

/** Resolves an achievement's current progress for the achievements screen. */
export function achievementProgress(player: Player, achId: string): number {
  const def = ACHIEVEMENT_BY_ID[achId];
  if (!def) return 0;
  return Math.min(1, statValue(player, def.stat) / def.goal);
}
