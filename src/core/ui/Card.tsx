import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { elevation, radii, spacing, type Elevation, type Radius, type Spacing } from '../design/tokens';
import { useTheme } from '../design/ThemeProvider';

export interface CardProps {
  children: ReactNode;
  padding?: Spacing | number;
  radius?: Radius;
  elevated?: Elevation;
  /** Use the slightly lighter "alt" surface for nested cards. */
  alt?: boolean;
  bordered?: boolean;
  style?: ViewStyle;
}

/** A surface container — the base for tiles, panels and list rows. */
export function Card({
  children,
  padding = 'lg',
  radius = 'lg',
  elevated = 'sm',
  alt,
  bordered = true,
  style,
}: CardProps) {
  const theme = useTheme();
  const pad = typeof padding === 'number' ? padding : spacing[padding];
  return (
    <View
      style={[
        {
          backgroundColor: alt ? theme.colors.surfaceAlt : theme.colors.surface,
          borderRadius: radii[radius],
          padding: pad,
          borderWidth: bordered ? 1 : 0,
          borderColor: theme.colors.border,
        },
        elevation[elevated],
        style,
      ]}
    >
      {children}
    </View>
  );
}
