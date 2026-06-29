import { palette } from './tokens';

/**
 * Curated multi-stop gradients used across backgrounds, buttons and FX.
 * Tuples are typed `readonly [string, string, ...]` so they satisfy
 * expo-linear-gradient's `colors` prop (which requires >= 2 stops).
 */
export type GradientStops = readonly [string, string, ...string[]];

export const gradients = {
  // App canvas — subtle vertical night gradient.
  canvas: [palette.night1, palette.night0] as GradientStops,
  canvasDeep: [palette.night2, palette.night0] as GradientStops,

  // Brand / primary CTA
  brand: [palette.violetBright, palette.violet, palette.violetDeep] as GradientStops,
  brandSheen: [palette.violetBright, palette.magenta] as GradientStops,

  // Accent gradients
  sunset: [palette.orange, palette.magenta, palette.violet] as GradientStops,
  aqua: [palette.cyan, palette.blue] as GradientStops,
  gold: [palette.gold, palette.goldDeep] as GradientStops,
  success: [palette.green, palette.greenDeep] as GradientStops,
  danger: [palette.red, palette.redDeep] as GradientStops,
  xp: [palette.cyan, palette.violetBright] as GradientStops,

  // Hero glow used behind the logo / winner screens
  spotlight: ['rgba(157,92,255,0.55)', 'rgba(157,92,255,0)'] as GradientStops,
  shine: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)'] as GradientStops,
} as const;

export type GradientName = keyof typeof gradients;

/** Builds a transparent→color→transparent sweep used by the Shimmer FX. */
export function sweep(color: string): GradientStops {
  return ['rgba(255,255,255,0)', color, 'rgba(255,255,255,0)'];
}
