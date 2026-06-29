import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { textVariants, type TextVariant } from '../design/typography';
import { useTheme } from '../design/ThemeProvider';
import type { Theme } from '../design/theme';

type ThemeColorKey = keyof Theme['colors'];

export interface TextProps extends RNTextProps {
  /** Named type style from the design system. Defaults to `body`. */
  variant?: TextVariant;
  /** A semantic theme color key, or any raw color string. Defaults to `text`. */
  color?: ThemeColorKey | (string & {});
  align?: TextStyle['textAlign'];
  /** Quick opacity for de-emphasis without changing color. */
  dim?: boolean;
  uppercase?: boolean;
}

/**
 * The single text primitive. Every label, heading and number in the app is an
 * `<AppText>` so typography and color stay consistent and themeable.
 */
export function AppText({
  variant = 'body',
  color = 'text',
  align,
  dim,
  uppercase,
  style,
  children,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const resolved =
    color in theme.colors ? theme.colors[color as ThemeColorKey] : (color as string);

  return (
    <RNText
      style={[
        textVariants[variant],
        { color: resolved, textAlign: align },
        dim && { opacity: 0.6 },
        uppercase && { textTransform: 'uppercase' as const },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
