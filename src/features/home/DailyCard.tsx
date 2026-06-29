import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { gradients } from '../../core/design/gradients';
import { radii, spacing } from '../../core/design/tokens';
import { AppText, Icon, PressableScale } from '../../core/ui';
import { t } from '../../core/i18n';
import { dateKey } from '../../core/utils/format';
import { XP_REWARDS } from '../../domain';
import { useDailyStore } from '../../state';
import { dailyModeId, getModeMeta } from '../../features/games/registry';

/** The Daily Challenge entry point — today's mode, reward and completion state. */
export function DailyCard() {
  const router = useRouter();
  const today = dateKey();
  const done = useDailyStore((s) => s.completedDates.includes(today));
  const mode = getModeMeta(dailyModeId(today));

  return (
    <PressableScale feedback="press" onPress={() => router.push('/daily')} scaleTo={0.97} disabled={done}>
      <LinearGradient
        colors={done ? [gradients.success[0], gradients.success[1]] : gradients.sunset}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radii.xl, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.lg,
            backgroundColor: 'rgba(0,0,0,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 30 }}>{done ? '✅' : mode?.emoji ?? '🎯'}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color="onColor" uppercase dim>
            {t.home.daily}
          </AppText>
          <AppText variant="subheading" color="onColor" numberOfLines={1}>
            {done ? 'Heute erledigt! 🎉' : mode?.title ?? t.home.dailySub}
          </AppText>
          {!done && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Icon name="flash" size={13} color="onColor" />
              <AppText variant="caption" color="onColor" dim>
                +{XP_REWARDS.dailyChallenge} XP · +80 Münzen
              </AppText>
            </View>
          )}
        </View>
        {!done && <Icon name="chevron-forward" size={24} color="onColor" />}
      </LinearGradient>
    </PressableScale>
  );
}
