import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { palette, spacing, zLayers } from '../../core/design/tokens';
import { AppText } from '../../core/ui';
import { useOnlineStore } from '../../state/onlineStore';

/**
 * A full-screen overlay shown while the connection is recovering. Keeps players
 * informed during a dropped network, backgrounding, host migration or relay
 * restart — the game/lobby underneath stays mounted and resumes seamlessly.
 */
export function ReconnectOverlay() {
  const status = useOnlineStore((s) => s.status);
  if (status !== 'reconnecting') return null;

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      pointerEvents="auto"
      style={[StyleSheet.absoluteFill, styles.overlay]}
    >
      <View style={styles.card}>
        <ActivityIndicator size="large" color={palette.violetBright} />
        <AppText variant="subheading" color="text" align="center">
          Verbindung wird wiederhergestellt …
        </AppText>
        <AppText variant="caption" color="textFaint" align="center">
          Dein Platz bleibt erhalten
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(7,4,23,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: zLayers.overlay,
  },
  card: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
});
