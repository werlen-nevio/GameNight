import { View } from 'react-native';

import { spacing } from '../design/tokens';
import { AppText } from './Text';
import { PressableScale } from './PressableScale';
import { Icon } from './Icon';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional trailing action (e.g. "Alle ansehen ›"). */
  actionLabel?: string;
  onAction?: () => void;
}

/** A consistent section title row with an optional trailing action. */
export function SectionHeader({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="heading" color="text">
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" color="textFaint">
            {subtitle}
          </AppText>
        )}
      </View>
      {actionLabel && onAction && (
        <PressableScale
          feedback="tap"
          onPress={onAction}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
        >
          <AppText variant="caption" color="primaryBright">
            {actionLabel}
          </AppText>
          <Icon name="chevron-forward" size={14} color="primaryBright" />
        </PressableScale>
      )}
    </View>
  );
}
