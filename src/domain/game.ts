import type { ThemeAccent } from '../core/design/theme';
import type { GradientStops } from '../core/design/gradients';
import type { IconName } from '../core/ui/Icon';
import { palette } from '../core/design/tokens';

/** How a mode can be played. */
export type PlayMode = 'solo' | 'local' | 'online';

/** Difficulty tiers offered by quiz-style modes. */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

/** Top-level grouping used to organize the mode picker. */
export type GameCategory = 'quiz' | 'party' | 'reaction' | 'word' | 'guess';

export const CATEGORY_LABEL: Record<GameCategory, string> = {
  quiz: 'Quiz',
  party: 'Party',
  reaction: 'Reaktion',
  word: 'Wörter',
  guess: 'Raten',
};

/** Whether a mode is fully playable or announced for a future update. */
export type ModeStatus = 'ready' | 'soon';

/**
 * Static metadata describing a game mode. The playable component is registered
 * separately (see `features/games/registry`) so this stays a pure data layer.
 */
export interface GameModeMeta {
  id: string;
  title: string;
  tagline: string;
  description: string;
  emoji: string;
  icon: IconName;
  category: GameCategory;
  status: ModeStatus;
  /** Signature color + gradient that themes the whole mode. */
  color: string;
  gradient: GradientStops;
  accent: ThemeAccent;
  supports: { solo: boolean; local: boolean; online: boolean; bots: boolean };
  minPlayers: number;
  maxPlayers: number;
  estimatedMinutes: number;
  difficulties?: Difficulty[];
}

/** Distinct, high-contrast seat colors assigned to players in a match. */
export const PLAYER_COLORS = [
  palette.violetBright,
  palette.cyan,
  palette.magenta,
  palette.gold,
  palette.green,
  palette.orange,
  palette.blue,
  palette.lime,
] as const;

/** A participant in a single match (human or bot). */
export interface GamePlayer {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isBot: boolean;
  isYou: boolean;
  /** Bot skill, 0..1, only meaningful when `isBot`. */
  botSkill?: number;
}

/** The resolved configuration a match runs with. */
export interface GameConfig {
  playMode: PlayMode;
  difficulty: Difficulty;
  rounds: number;
  /** Seconds per round/turn where applicable. */
  timeLimit: number;
  /** Mode-specific options (category ids, toggles, …). */
  options?: Record<string, unknown>;
}

export interface GameSession {
  mode: GameModeMeta;
  config: GameConfig;
  players: GamePlayer[];
  /** Deterministic seed (date for daily, lobby code for online). */
  seed?: string;
}

/** A single player's final tally. */
export interface PlayerScore {
  playerId: string;
  score: number;
}

/** What a game reports when play ends; the shell turns this into rewards. */
export interface GameOutcome {
  scores: PlayerScore[];
  /** Correct answers by *you*, for progression/achievements. */
  correctAnswers?: number;
  /** Did you complete a flawless run? */
  perfect?: boolean;
  rounds?: number;
}

/** Props every playable game component receives from the shell. */
export interface GameplayProps {
  session: GameSession;
  onComplete: (outcome: GameOutcome) => void;
  onQuit: () => void;
}

/** Ranking row produced by {@link rankOutcome}. */
export interface RankedPlayer {
  player: GamePlayer;
  score: number;
  rank: number;
  isWinner: boolean;
}

/**
 * Turns raw scores into a sorted ranking with tie-aware winner detection and
 * the local player's placement — the basis for the scoreboard & winner screen.
 */
export function rankOutcome(session: GameSession, outcome: GameOutcome) {
  const byId = new Map(outcome.scores.map((s) => [s.playerId, s.score]));
  const rows = session.players
    .map((player) => ({ player, score: byId.get(player.id) ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const top = rows.length ? rows[0].score : 0;
  let lastScore = Number.POSITIVE_INFINITY;
  let lastRank = 0;
  const ranked: RankedPlayer[] = rows.map((row, i) => {
    const rank = row.score === lastScore ? lastRank : i + 1;
    lastScore = row.score;
    lastRank = rank;
    return { ...row, rank, isWinner: row.score === top && top > 0 };
  });

  const you = ranked.find((r) => r.player.isYou);
  const winners = ranked.filter((r) => r.isWinner);
  return {
    ranked,
    winners,
    youWon: !!you?.isWinner,
    yourRank: you?.rank ?? ranked.length,
    yourScore: you?.score ?? 0,
    isDraw: winners.length > 1,
  };
}
