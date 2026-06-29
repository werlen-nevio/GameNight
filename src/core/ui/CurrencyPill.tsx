import { View, type ViewStyle } from 'react-native';

import { radii, spacing } from '../design/tokens';
import { useTheme } from '../design/ThemeProvider';
import { compactNumber } from '../utils/format';
import { AppText } from './Text';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export type CurrencyKind = 'coin' | 'gem' | 'xp';

const CONFIG: Record<CurrencyKind, { icon: IconName; color: keyof ReturnType<typeof useTheme>['colors'] }> = {
  coin: { icon: 'logo-bitcoin', color: 'coin' },
  gem: { icon: 'diamond', color: 'gem' },
  xp: { icon: 'flash', color: 'xp' },
};

export interface CurrencyPillProps {
  kind: CurrencyKind;
  value: number;
  /** Show a small "+" add affordance (e.g. to open the shop). */
  onAdd?: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

/** The coins / gems / XP pill used in headers and the shop. */
export function CurrencyPill({ kind, value, onAdd, compact = true, style }: CurrencyPillProps) {
  const theme = useTheme();
  const cfg = CONFIG[kind];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          backgroundColor: 'rgba(0,0,0,0.30)',
          borderRadius: radii.pill,
          paddingVertical: spacing.xs,
          paddingLeft: spacing.sm,
          paddingRight: onAdd ? spacing.xxs : spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <Icon name={cfg.icon} size={16} color={cfg.color} />
      <AppText variant="caption" color="text">
        {compact ? compactNumber(value) : value.toLocaleString('de-DE')}
      </AppText>
      {onAdd && (
        <PressableScale
          feedback="tap"
          onPress={onAdd}
          style={{
            marginLeft: spacing.xxs,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="add" size={16} color="onPrimary" />
        </PressableScale>
      )}
    </View>
  );
}
