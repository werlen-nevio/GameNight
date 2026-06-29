import { palette } from './tokens';
import { gradients, type GradientStops } from './gradients';

/**
 * Semantic theme. Components read *these* names (e.g. `colors.surface`,
 * `colors.primary`) rather than raw palette entries, so re-skinning — or a
 * future light mode — is a one-file change.
 */
export interface Theme {
  /** Theme identity, handy for conditional styling/analytics. */
  name: string;
  isDark: boolean;
  colors: {
    bg: string;
    bgElevated: string;
    surface: string;
    surfaceAlt: string;
    surfaceElevated: string;
    border: string;
    borderStrong: string;

    primary: string;
    primaryBright: string;
    primaryDeep: string;
    onPrimary: string;

    text: string;
    textMuted: string;
    textFaint: string;
    onColor: string;

    success: string;
    danger: string;
    warning: string;
    coin: string;
    gem: string;
    xp: string;
  };
  /** Named gradients available to this theme. */
  gradients: {
    canvas: GradientStops;
    primary: GradientStops;
    xp: GradientStops;
    coin: GradientStops;
    success: GradientStops;
    danger: GradientStops;
  };
}

/** The default — and currently only — app theme. Dark, vibrant, premium. */
export const darkTheme: Theme = {
  name: 'night',
  isDark: true,
  colors: {
    bg: palette.night1,
    bgElevated: palette.night2,
    surface: palette.night2,
    surfaceAlt: palette.night3,
    surfaceElevated: palette.night4,
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.16)',

    primary: palette.violet,
    primaryBright: palette.violetBright,
    primaryDeep: palette.violetDeep,
    onPrimary: palette.white,

    text: palette.cloud,
    textMuted: palette.fog,
    textFaint: palette.mist,
    onColor: palette.white,

    success: palette.green,
    danger: palette.red,
    warning: palette.orange,
    coin: palette.gold,
    gem: palette.cyan,
    xp: palette.cyan,
  },
  gradients: {
    canvas: gradients.canvas,
    primary: gradients.brand,
    xp: gradients.xp,
    coin: gradients.gold,
    success: gradients.success,
    danger: gradients.danger,
  },
};

/**
 * A partial override of theme colors/gradients, used by game modes to tint an
 * entire subtree with their signature accent without redefining the whole theme.
 */
export interface ThemeAccent {
  primary?: string;
  primaryBright?: string;
  primaryDeep?: string;
  primaryGradient?: GradientStops;
  canvasGradient?: GradientStops;
}

/** Produces a derived theme with a game mode's accent applied. */
export function withAccent(base: Theme, accent?: ThemeAccent): Theme {
  if (!accent) return base;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: accent.primary ?? base.colors.primary,
      primaryBright: accent.primaryBright ?? base.colors.primaryBright,
      primaryDeep: accent.primaryDeep ?? base.colors.primaryDeep,
    },
    gradients: {
      ...base.gradients,
      primary: accent.primaryGradient ?? base.gradients.primary,
      canvas: accent.canvasGradient ?? base.gradients.canvas,
    },
  };
}
