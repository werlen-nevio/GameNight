import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { radii, spacing } from '../design/tokens';
import { useTheme } from '../design/ThemeProvider';
import { AppText } from './Text';
import { PressableScale } from './PressableScale';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
  /** Accent color when selected; defaults to theme primary. */
  accent?: string;
  style?: ViewStyle;
}

/** A pill-shaped selectable tag — categories, filters, difficulty toggles. */
export function Chip({ label, selected, onPress, icon, accent, style }: ChipProps) {
  const theme = useTheme();
  const activeColor = accent ?? theme.colors.primary;

  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          borderRadius: radii.pill,
          backgroundColor: selected ? activeColor : theme.colors.surfaceAlt,
          borderWidth: 1.5,
          borderColor: selected ? activeColor : theme.colors.border,
        },
        style,
      ]}
    >
      {icon}
      <AppText variant="caption" color={selected ? 'onColor' : 'textMuted'}>
        {label}
      </AppText>
    </View>
  );

  if (!onPress) return body;
  return (
    <PressableScale feedback="select" onPress={onPress} scaleTo={0.92}>
      {body}
    </PressableScale>
  );
}
