import { type ReactNode } from 'react';
import { View } from 'react-native';

import { spacing } from '../../../core/design/tokens';
import { AppText, IconButton } from '../../../core/ui';

/** A consistent in-game header: quit on the left, title centered, slot on the right. */
export function GameTopBar({
  title,
  subtitle,
  onQuit,
  right,
}: {
  title?: string;
  subtitle?: string;
  onQuit: () => void;
  right?: ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        gap: spacing.md,
      }}
    >
      <IconButton name="close" onPress={onQuit} size={42} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title && (
          <AppText variant="subheading" color="text" numberOfLines={1}>
            {title}
          </AppText>
        )}
        {subtitle && (
          <AppText variant="label" color="textFaint" uppercase>
            {subtitle}
          </AppText>
        )}
      </View>
      <View style={{ minWidth: 42, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}
