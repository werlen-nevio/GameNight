import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AccentProvider } from '../../../core/design/ThemeProvider';
import { radii, spacing } from '../../../core/design/tokens';
import { AppText, GameButton, Icon, Screen, Tag } from '../../../core/ui';
import { Shimmer } from '../../../core/fx';
import { t } from '../../../core/i18n';
import type { GameModeMeta } from '../../../domain';

/** A polished placeholder for announced-but-unreleased modes. */
export function ComingSoon({ meta, onBack }: { meta: GameModeMeta; onBack: () => void }) {
  return (
    <AccentProvider accent={meta.accent}>
      <Screen gradient={meta.accent.canvasGradient}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
          <Animated.View entering={FadeInDown.springify().damping(15)} style={{ alignItems: 'center', gap: spacing.lg }}>
            <View>
              <LinearGradient
                colors={meta.gradient}
                style={{ width: 130, height: 130, borderRadius: radii.xxl, alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText style={{ fontSize: 72 }}>{meta.emoji}</AppText>
              </LinearGradient>
              <Shimmer width={130} height={130} radius={radii.xxl} />
            </View>
            <Tag label={t.common.soon.toUpperCase()} tone="hot" />
            <AppText variant="display" color="text" align="center">
              {meta.title}
            </AppText>
            <AppText variant="body" color="textMuted" align="center" style={{ maxWidth: 320 }}>
              {meta.description}
            </AppText>
            <AppText variant="caption" color="textFaint" align="center">
              Dieser Modus ist in Arbeit und erscheint in einem kommenden Update.
            </AppText>
          </Animated.View>
        </View>
        <View style={{ padding: spacing.xl }}>
          <GameButton
            label={t.common.back}
            variant="secondary"
            size="lg"
            leftIcon={<Icon name="arrow-back" size={20} color="text" />}
            onPress={onBack}
          />
        </View>
      </Screen>
    </AccentProvider>
  );
}
