import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';

import { useTheme } from '../design/ThemeProvider';
import type { Theme } from '../design/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
type ThemeColorKey = keyof Theme['colors'];

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ThemeColorKey | (string & {});
}

/** Themed icon wrapper. Keeps icon usage consistent and color-token aware. */
export function Icon({ name, size = 24, color = 'text' }: IconProps) {
  const theme = useTheme();
  const resolved =
    color in theme.colors ? theme.colors[color as ThemeColorKey] : (color as string);
  return <Ionicons name={name} size={size} color={resolved} />;
}
