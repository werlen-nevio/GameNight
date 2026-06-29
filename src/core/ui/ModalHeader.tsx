import { View } from 'react-native';

import { spacing } from '../design/tokens';
import { AppText } from './Text';
import { IconButton } from './IconButton';

/** A consistent header for modal screens: title + a close (down-chevron) button. */
export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
      }}
    >
      <AppText variant="title" color="text">
        {title}
      </AppText>
      <IconButton name="close" size={42} onPress={onClose} />
    </View>
  );
}
