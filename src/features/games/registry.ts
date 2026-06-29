import { Rng, hashSeed } from '../../core/utils/random';
import type { GameModeMeta } from '../../domain';
import { ALL_MODE_METAS, MODE_META } from './catalog';
import type { GameModule } from './shared/types';
import { stadtLandFlussModule } from './stadt-land-fluss/module';
import { millionaireModule } from './millionaire/module';
import { higherLowerModule } from './higher-lower/module';
import { reactionModule } from './reaction/module';
import { guessPriceModule } from './guess-price/module';

/**
 * The registry of *playable* modes. A mode appears here once it has a
 * {@link GameModule}; everything else in the catalog renders a "coming soon"
 * screen. Adding a new mode = drop a module folder + one line here.
 */
const MODULES: GameModule[] = [
  stadtLandFlussModule,
  millionaireModule,
  reactionModule,
  higherLowerModule,
  guessPriceModule,
];

export const GAME_MODULES: Record<string, GameModule> = Object.fromEntries(
  MODULES.map((m) => [m.meta.id, m]),
);

export function getModule(id: string): GameModule | undefined {
  return GAME_MODULES[id];
}

export function getModeMeta(id: string): GameModeMeta | undefined {
  return MODE_META[id];
}

export function isPlayable(id: string): boolean {
  return id in GAME_MODULES;
}

export { ALL_MODE_METAS };

/** Ready modes eligible to be the Daily Challenge. */
const DAILY_POOL = MODULES.map((m) => m.meta.id);

/** Deterministically selects today's Daily Challenge mode from a date key. */
export function dailyModeId(dateKey: string): string {
  const rng = new Rng(hashSeed('daily-' + dateKey));
  return rng.pick(DAILY_POOL) ?? stadtLandFlussModule.meta.id;
}
