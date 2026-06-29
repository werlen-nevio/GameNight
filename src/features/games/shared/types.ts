import type { ComponentType } from 'react';

import type { IconName } from '../../../core/ui/Icon';
import type { Difficulty, GameModeMeta, GameplayProps } from '../../../domain';

/** A single rule explained on the pre-game rules screen. */
export interface RuleStep {
  icon: IconName;
  title: string;
  text: string;
}

export interface GameRules {
  objective: string;
  steps: RuleStep[];
}

/** Props for a mode's optional extra lobby options panel. */
export interface GameOptionsProps {
  difficulty: Difficulty;
  options: Record<string, unknown>;
  setOption: (key: string, value: unknown) => void;
}

/** Resolved per-match config a module derives from lobby choices. */
export interface ResolvedConfig {
  rounds: number;
  timeLimit: number;
  options?: Record<string, unknown>;
}

/**
 * The contract every playable mode fulfils. The shell knows nothing about a
 * specific game — it just renders these pieces around the `Gameplay` component.
 */
export interface GameModule {
  meta: GameModeMeta;
  rules: GameRules;
  Gameplay: ComponentType<GameplayProps>;
  /** Optional extra options surfaced in the lobby (e.g. category pickers). */
  Options?: ComponentType<GameOptionsProps>;
  /** Default options seeded into the lobby. */
  defaultOptions?: Record<string, unknown>;
  /** Turns the chosen difficulty + options into a concrete match config. */
  buildConfig: (input: { difficulty: Difficulty; options: Record<string, unknown> }) => ResolvedConfig;
  /**
   * Maximum legitimately achievable score for a config — used by the host to
   * reject impossible client-reported scores (anti-cheat). Omit for a sane
   * default derived from rounds.
   */
  scoreCap?: (config: ResolvedConfig) => number;
}
