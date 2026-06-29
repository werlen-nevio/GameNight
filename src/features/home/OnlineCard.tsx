import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { gradients } from '../../core/design/gradients';
import { radii, spacing } from '../../core/design/tokens';
import { AppText, Icon, PressableScale } from '../../core/ui';

/** Home entry into cross-platform online play. */
export function OnlineCard() {
  const router = useRouter();
  return (
    <PressableScale feedback="press" onPress={() => router.push('/online')} scaleTo={0.97}>
      <LinearGradient
        colors={gradients.aqua}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radii.xl, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      >
        <View style={{ width: 52, height: 52, borderRadius: radii.lg, backgroundColor: 'rgba(0,0,0,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="globe" size={28} color="onColor" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading" color="onColor">
            Online spielen
          </AppText>
          <AppText variant="caption" color="onColor" dim>
            Lobby erstellen · mit Code beitreten · plattformübergreifend
          </AppText>
        </View>
        <Icon name="chevron-forward" size={24} color="onColor" />
      </LinearGradient>
    </PressableScale>
  );
}
