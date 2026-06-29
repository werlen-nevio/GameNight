import { ACHIEVEMENTS, levelFromXp, type AchievementStat, type Player } from '../../domain';
import type { SteamIntegration } from './types';

/**
 * Pure mapping between GameNight progression and the Steamworks achievement /
 * stat / cloud backends. Kept side-effect-free (apart from the explicit `sync*`
 * entry points) so it can be unit-tested without a Steam runtime.
 *
 * Steam API names follow the UPPER_SNAKE convention configured in the Steamworks
 * partner site. The app id's achievement/stat schema must declare these names.
 */

/** App achievement id (`ach_first_win`) -> Steam API name (`ACH_FIRST_WIN`). */
export const STEAM_ACHIEVEMENT_API: Record<string, string> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, 'ACH_' + a.id.replace(/^ach_/, '').toUpperCase()]),
);

/** Steam stat API names, mirrored from the player's lifetime stats. */
export const STEAM_STAT = {
  gamesPlayed: 'STAT_GAMES_PLAYED',
  wins: 'STAT_WINS',
  correctAnswers: 'STAT_CORRECT_ANSWERS',
  perfectRounds: 'STAT_PERFECT_ROUNDS',
  dailyChallenges: 'STAT_DAILY_CHALLENGES',
  bestStreak: 'STAT_BEST_STREAK',
  modesPlayed: 'STAT_MODES_PLAYED',
  coinsEarned: 'STAT_COINS_EARNED',
  xp: 'STAT_XP',
  level: 'STAT_LEVEL',
} as const;

export const CLOUD_SAVE_FILE = 'gamenight_profile.json';

/** Resolves an achievement's current numeric progress against its stat. */
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

/** The integer stat map Steam should hold for this player. */
export function steamStatsFromPlayer(player: Player): Record<string, number> {
  return {
    [STEAM_STAT.gamesPlayed]: player.stats.gamesPlayed,
    [STEAM_STAT.wins]: player.stats.wins,
    [STEAM_STAT.correctAnswers]: player.stats.correctAnswers,
    [STEAM_STAT.perfectRounds]: player.stats.perfectRounds,
    [STEAM_STAT.dailyChallenges]: player.stats.dailyChallenges,
    [STEAM_STAT.bestStreak]: player.stats.bestStreak,
    [STEAM_STAT.modesPlayed]: player.stats.modesPlayed.length,
    [STEAM_STAT.coinsEarned]: player.stats.coinsEarned,
    [STEAM_STAT.xp]: player.xp,
    [STEAM_STAT.level]: levelFromXp(player.xp).level,
  };
}

export interface SteamSyncResult {
  unlocked: string[]; // Steam API names newly unlocked this sync
  statsPushed: number;
}

/**
 * Pushes the player's stats and unlocks any earned-but-not-yet-synced
 * achievements to Steam, and shows progress indicators for in-flight ones.
 * Idempotent: only achievements Steam doesn't already report as unlocked are
 * activated, so it is safe to call after every match. No-op off-Steam.
 */
export function syncSteamProgress(steam: SteamIntegration, player: Player): SteamSyncResult {
  if (!steam.available) return { unlocked: [], statsPushed: 0 };

  let statsPushed = 0;
  for (const [name, value] of Object.entries(steamStatsFromPlayer(player))) {
    if (steam.stats.setInt(name, value)) statsPushed++;
  }

  const unlocked: string[] = [];
  for (const id of player.unlockedAchievements) {
    const api = STEAM_ACHIEVEMENT_API[id];
    if (!api || steam.achievements.isUnlocked(api)) continue;
    if (steam.achievements.unlock(api)) unlocked.push(api);
  }

  // Progress toasts for achievements still in flight.
  for (const ach of ACHIEVEMENTS) {
    if (player.unlockedAchievements.includes(ach.id)) continue;
    const api = STEAM_ACHIEVEMENT_API[ach.id];
    const current = Math.min(statValue(player, ach.stat), ach.goal);
    if (current > 0 && current < ach.goal) steam.achievements.indicateProgress(api, current, ach.goal);
  }

  steam.achievements.store();
  steam.stats.store();
  return { unlocked, statsPushed };
}

/**
 * Conflict resolution for two profiles (local vs Steam Cloud). Prefers the one
 * with more lifetime progress — higher XP, tie-broken by games played — so a
 * cloud pull never regresses a player's account.
 */
export function resolveCloudConflict(local: Player, remote: Player): Player {
  if (remote.xp > local.xp) return remote;
  if (remote.xp === local.xp && remote.stats.gamesPlayed > local.stats.gamesPlayed) return remote;
  return local;
}

/** Writes the profile to Steam Cloud. Returns false off-Steam / on failure. */
export function pushCloudSave(steam: SteamIntegration, player: Player): boolean {
  if (!steam.cloud.available) return false;
  return steam.cloud.write(CLOUD_SAVE_FILE, JSON.stringify(player));
}

/** Reads + parses the Steam Cloud profile, or null if absent / off-Steam. */
export function pullCloudSave(steam: SteamIntegration): Player | null {
  if (!steam.cloud.available) return null;
  const raw = steam.cloud.read(CLOUD_SAVE_FILE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Player;
  } catch {
    return null;
  }
}

/** Sets lobby rich presence so friends can see + join from the Steam overlay. */
export function setSteamLobbyPresence(
  steam: SteamIntegration,
  info: { status: string; code?: string; mode?: string; players?: number; max?: number },
): void {
  if (!steam.available) return;
  steam.richPresence.set('status', info.status);
  steam.richPresence.set('steam_display', '#StatusFull');
  if (info.mode) steam.richPresence.set('mode', info.mode);
  if (info.players != null && info.max != null) {
    steam.richPresence.set('players', `${info.players}/${info.max}`);
    steam.richPresence.set('steam_player_group_size', String(info.max));
  }
  // `connect` powers the overlay "Join game" button + invite accept flow.
  if (info.code) steam.richPresence.set('connect', `--gamenight-join ${info.code}`);
}
