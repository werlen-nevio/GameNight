import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { spacing } from '../../core/design/tokens';
import {
  AppText,
  Avatar,
  CurrencyPill,
  IconButton,
  PressableScale,
  ProgressBar,
} from '../../core/ui';
import { t } from '../../core/i18n';
import { AVATAR_BY_ID, FRAME_BY_ID, levelFromXp } from '../../domain';
import { usePlayerStore } from '../../state';

/** Top-of-home status bar: avatar + level + XP, currencies and settings. */
export function HomeHeader() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const level = levelFromXp(player.xp);
  const avatar = AVATAR_BY_ID[player.equipped.avatar];
  const frame = FRAME_BY_ID[player.equipped.frame];

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <PressableScale feedback="tap" onPress={() => router.push('/profile')}>
          <Avatar emoji={avatar?.emoji} size={52} frame={frame?.gradient} />
        </PressableScale>

        <View style={{ flex: 1 }}>
          <AppText variant="caption" color="textFaint">
            {greeting()}
          </AppText>
          <AppText variant="subheading" color="text" numberOfLines={1}>
            {player.name}
          </AppText>
        </View>

        <CurrencyPill kind="coin" value={player.coins} onAdd={() => router.push('/shop')} />
        <IconButton name="settings-sharp" size={42} onPress={() => router.push('/settings')} />
      </View>

      {/* Level + XP */}
      <PressableScale feedback="tap" onPress={() => router.push('/profile')} scaleTo={0.98}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
              borderRadius: 8,
              backgroundColor: 'rgba(157,92,255,0.2)',
            }}
          >
            <AppText variant="caption" color="primaryBright">
              {t.common.levelShort} {level.level}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <ProgressBar progress={level.progress} height={10} />
          </View>
          <AppText variant="label" color="textFaint">
            {level.xpIntoLevel}/{level.xpForThisLevel}
          </AppText>
        </View>
      </PressableScale>
    </View>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return t.home.greetingMorning;
  if (h >= 18) return t.home.greetingEvening;
  return t.home.greetingDay;
}
