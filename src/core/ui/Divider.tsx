import { View } from 'react-native';

import { spacing } from '../design/tokens';
import { useTheme } from '../design/ThemeProvider';
import { AppText } from './Text';

/** A hairline divider, optionally with a centered label ("oder"). */
export function Divider({ label, vertical }: { label?: string; vertical?: boolean }) {
  const theme = useTheme();

  if (vertical) {
    return <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: theme.colors.border }} />;
  }

  if (!label) {
    return <View style={{ height: 1, backgroundColor: theme.colors.border }} />;
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
      <AppText variant="label" color="textFaint" uppercase>
        {label}
      </AppText>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
    </View>
  );
}
