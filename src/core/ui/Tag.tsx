import { View, type ViewStyle } from 'react-native';

import { radii, spacing } from '../design/tokens';
import { useTheme } from '../design/ThemeProvider';
import { AppText } from './Text';

export type TagTone = 'new' | 'soon' | 'hot' | 'pro' | 'neutral';

/** A tiny status badge: "NEU", "BALD", "HOT", "PRO". */
export function Tag({ label, tone = 'neutral', style }: { label: string; tone?: TagTone; style?: ViewStyle }) {
  const theme = useTheme();
  const bg: Record<TagTone, string> = {
    new: theme.colors.success,
    soon: theme.colors.textFaint,
    hot: theme.colors.danger,
    pro: theme.colors.coin,
    neutral: theme.colors.surfaceElevated,
  };
  const fg: Record<TagTone, string> = {
    new: theme.colors.onColor,
    soon: theme.colors.bg,
    hot: theme.colors.onColor,
    pro: '#3A2A00',
    neutral: theme.colors.textMuted,
  };

  return (
    <View
      style={[
        {
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
          borderRadius: radii.pill,
          backgroundColor: bg[tone],
        },
        style,
      ]}
    >
      <AppText variant="label" style={{ color: fg[tone], fontSize: 9 }}>
        {label}
      </AppText>
    </View>
  );
}
