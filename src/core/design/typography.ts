/**
 * Typography system. Three families create the GameNight voice:
 *  - `display`  Baloo 2  — rounded, friendly, used for headings & buttons.
 *  - `body`     Nunito   — highly legible body / UI copy.
 *  - `impact`   Luckiest Guy — reserved for hero moments (logo, "WINNER!", big numbers).
 *
 * Font keys here must match the keys registered in {@link loadAppFonts}.
 */

export const fontFamily = {
  displayRegular: 'Baloo2_400Regular',
  displayMedium: 'Baloo2_500Medium',
  displaySemiBold: 'Baloo2_600SemiBold',
  displayBold: 'Baloo2_700Bold',
  displayExtraBold: 'Baloo2_800ExtraBold',

  bodyLight: 'Nunito_300Light',
  bodyRegular: 'Nunito_400Regular',
  bodyMedium: 'Nunito_500Medium',
  bodySemiBold: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyExtraBold: 'Nunito_800ExtraBold',
  bodyBlack: 'Nunito_900Black',

  impact: 'LuckiestGuy_400Regular',
} as const;

export type FontFamily = keyof typeof fontFamily;

/**
 * Named text styles. Each entry is a complete, ready-to-spread RN text style.
 * `letterSpacing` is tuned per size; line heights keep multi-line copy airy.
 */
export const textVariants = {
  hero: {
    fontFamily: fontFamily.impact,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: 0.5,
  },
  display: {
    fontFamily: fontFamily.displayExtraBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.2,
  },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 0.2,
  },
  heading: {
    fontFamily: fontFamily.displayBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  subheading: {
    fontFamily: fontFamily.displaySemiBold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: 0.1,
  },
  button: {
    fontFamily: fontFamily.displayBold,
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  body: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: 0,
  },
  bodyStrong: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  label: {
    fontFamily: fontFamily.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  numeric: {
    fontFamily: fontFamily.impact,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 0.5,
  },
} as const;

export type TextVariant = keyof typeof textVariants;
