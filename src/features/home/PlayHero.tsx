import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { elevation, radii, spacing } from '../../core/design/tokens';
import { useTheme } from '../../core/design/ThemeProvider';
import { AppText, Icon, PressableScale } from '../../core/ui';
import { Shimmer } from '../../core/fx';
import { Feedback } from '../../core/services';
import { t } from '../../core/i18n';
import { Rng } from '../../core/utils/random';
import { ALL_MODE_METAS } from '../../features/games/registry';

/** The hero "SPIELEN" call-to-action — launches a quick random ready mode. */
export function PlayHero() {
  const router = useRouter();
  const theme = useTheme();

  const quickPlay = () => {
    Feedback.press();
    const ready = ALL_MODE_METAS.filter((m) => m.status === 'ready');
    const pick = new Rng().pick(ready) ?? ready[0];
    router.push(`/game/${pick.id}`);
  };

  return (
    <PressableScale feedback={null} onPress={quickPlay} scaleTo={0.97}>
      <LinearGradient
        colors={theme.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          {
            borderRadius: radii.xxl,
            padding: spacing.xl,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.lg,
            overflow: 'hidden',
          },
          elevation.lg,
        ]}
      >
        <Shimmer width={400} height={120} radius={radii.xxl} />
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="play" size={36} color="onPrimary" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="display" color="onPrimary" style={{ fontSize: 30 }}>
            {t.home.play}
          </AppText>
          <AppText variant="caption" color="onPrimary" dim>
            {t.home.playSub}
          </AppText>
        </View>
        <Icon name="arrow-forward-circle" size={32} color="onPrimary" />
      </LinearGradient>
    </PressableScale>
  );
}
