import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { radii, spacing } from '../../core/design/tokens';
import { AppText, Card, Icon, ModalHeader, ProgressBar, Screen } from '../../core/ui';
import { t } from '../../core/i18n';
import { ACHIEVEMENTS } from '../../domain';
import { achievementProgress, usePlayerStore } from '../../state';

export function AchievementsScreen() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const unlockedCount = player.unlockedAchievements.length;

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title={t.progression.achievements} onClose={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: 0, gap: spacing.md }} showsVerticalScrollIndicator={false}>
        <AppText variant="caption" color="textFaint">
          {unlockedCount}/{ACHIEVEMENTS.length} freigeschaltet
        </AppText>

        {ACHIEVEMENTS.map((ach) => {
          const unlocked = player.unlockedAchievements.includes(ach.id);
          const progress = achievementProgress(player, ach.id);
          return (
            <Card key={ach.id} style={{ flexDirection: 'row', gap: spacing.md, opacity: unlocked ? 1 : 0.92 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radii.md,
                  backgroundColor: unlocked ? '#2BD57626' : 'rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={unlocked ? ach.icon : 'lock-closed'} size={24} color={unlocked ? 'success' : 'textFaint'} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText variant="subheading" color="text">
                    {ach.name}
                  </AppText>
                  {unlocked && <Icon name="checkmark-circle" size={20} color="success" />}
                </View>
                <AppText variant="caption" color="textMuted">
                  {ach.description}
                </AppText>
                {!unlocked && <ProgressBar progress={progress} height={8} gradient={['#2BD576', '#22E0D6']} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  {ach.reward.coins > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="logo-bitcoin" size={13} color="coin" />
                      <AppText variant="label" color="textFaint">
                        {ach.reward.coins}
                      </AppText>
                    </View>
                  )}
                  {ach.reward.gems > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="diamond" size={13} color="gem" />
                      <AppText variant="label" color="textFaint">
                        {ach.reward.gems}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
