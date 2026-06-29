/**
 * Design tokens — the single source of truth for the GameNight visual language.
 *
 * Nothing in the app hard-codes a hex value, spacing number, or duration; every
 * surface pulls from these tokens (directly, or via the active {@link Theme}).
 * This is what keeps a hundred game modes looking like one coherent product.
 */

/** Raw color ramps. Components should prefer semantic theme colors over these. */
export const palette = {
  // Night canvas — deep indigo/violet, the brand's "party at night" mood.
  night0: '#070417',
  night1: '#0B0720',
  night2: '#140B33',
  night3: '#1C1147',
  night4: '#271861',

  // Brand violet
  violet: '#9D5CFF',
  violetBright: '#B385FF',
  violetDeep: '#6C2BD9',

  // Accents
  magenta: '#FF4D8D',
  magentaDeep: '#D6246A',
  cyan: '#22E0D6',
  cyanDeep: '#0FB5AD',
  blue: '#3B82F6',
  lime: '#A8E63A',

  // Functional
  gold: '#FFD23F',
  goldDeep: '#E0A21B',
  green: '#2BD576',
  greenDeep: '#15A85A',
  red: '#FF5470',
  redDeep: '#D62b48',
  orange: '#FF8A3D',

  // Neutrals (warm-tinted to sit nicely on the violet canvas)
  white: '#FFFFFF',
  ink: '#0A0614',
  cloud: '#F4F1FF',
  fog: '#CFC7E6',
  mist: '#9A92B8',
  slate: '#6A6388',
  shadow: '#04020C',
} as const;

export type PaletteColor = keyof typeof palette;

/** 4-pt spacing scale. Use `spacing.md` etc., never magic numbers. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 56,
  colossal: 72,
} as const;

export type Spacing = keyof typeof spacing;

/** Corner radii — generous and rounded, matching the playful brand. */
export const radii = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 34,
  pill: 999,
  round: 9999,
} as const;

export type Radius = keyof typeof radii;

/** Motion durations (ms) and easing primitives — calm, snappy, never sluggish. */
export const motion = {
  instant: 80,
  fast: 140,
  base: 220,
  slow: 340,
  slower: 520,
  lazy: 800,
  // Spring presets consumed by reanimated `withSpring`.
  spring: {
    snappy: { damping: 18, stiffness: 220, mass: 0.9 },
    bouncy: { damping: 11, stiffness: 180, mass: 1 },
    gentle: { damping: 22, stiffness: 140, mass: 1 },
    stiff: { damping: 26, stiffness: 320, mass: 0.8 },
  },
} as const;

/** Elevation presets producing consistent, layered shadows. */
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  sm: {
    shadowColor: palette.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  md: {
    shadowColor: palette.shadow,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  lg: {
    shadowColor: palette.shadow,
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
} as const;

export type Elevation = keyof typeof elevation;

/** Opacity stops for overlays, scrims and disabled states. */
export const opacity = {
  disabled: 0.4,
  muted: 0.6,
  scrim: 0.72,
  hairline: 0.12,
  faint: 0.08,
} as const;

/** Z-index layers so stacking is intentional and collision-free. */
export const zLayers = {
  base: 0,
  raised: 10,
  sticky: 100,
  overlay: 1000,
  toast: 2000,
  fx: 3000,
} as const;

/** Standard hit-slop for small interactive targets (accessibility). */
export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 } as const;
