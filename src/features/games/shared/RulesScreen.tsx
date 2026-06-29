import { ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { radii, spacing } from '../../../core/design/tokens';
import { AppText, Card, GameButton, Icon } from '../../../core/ui';
import { t } from '../../../core/i18n';
import type { GameModule } from './types';

/** Explains the objective and rules before the countdown. */
export function RulesScreen({ module, onContinue }: { module: GameModule; onContinue: () => void }) {
  const { meta, rules } = module;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
          <AppText variant="label" color="primaryBright" uppercase>
            {t.game.howToPlay}
          </AppText>
          <AppText variant="title" color="text" align="center">
            {meta.title}
          </AppText>
        </View>

        <LinearGradient
          colors={meta.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radii.xl, padding: spacing.xl }}
        >
          <AppText variant="bodyStrong" color="onColor" align="center">
            {rules.objective}
          </AppText>
        </LinearGradient>

        <View style={{ gap: spacing.md }}>
          {rules.steps.map((step, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(i * 80).springify().damping(16)}>
              <Card style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radii.md,
                    backgroundColor: meta.color + '33',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={step.icon} size={22} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="subheading" color="text">
                    {step.title}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    {step.text}
                  </AppText>
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={{ padding: spacing.xl, paddingTop: spacing.sm }}>
        <GameButton
          label={t.game.ready}
          size="lg"
          leftIcon={<Icon name="checkmark-circle" size={22} color="onPrimary" />}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}
