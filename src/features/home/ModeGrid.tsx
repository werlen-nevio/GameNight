import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { elevation, radii, spacing } from '../../core/design/tokens';
import { AppText, Card, PressableScale, Tag } from '../../core/ui';
import { t } from '../../core/i18n';
import type { GameModeMeta } from '../../domain';
import { ALL_MODE_METAS } from '../../features/games/registry';

/** The grid of game modes. Two columns, each a themed, tappable tile. */
export function ModeGrid() {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {ALL_MODE_METAS.map((mode, i) => (
        <Animated.View key={mode.id} entering={FadeInDown.delay(i * 60).springify().damping(16)} style={{ width: '47.5%' }}>
          <ModeTile mode={mode} onPress={() => router.push(`/game/${mode.id}`)} />
        </Animated.View>
      ))}
    </View>
  );
}

function ModeTile({ mode, onPress }: { mode: GameModeMeta; onPress: () => void }) {
  const soon = mode.status === 'soon';
  return (
    <PressableScale feedback="press" onPress={onPress} scaleTo={0.95}>
      <Card padding="none" radius="xl" elevated="md" bordered={false} style={{ overflow: 'hidden' }}>
        <LinearGradient
          colors={mode.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 96, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText style={{ fontSize: 52, opacity: soon ? 0.55 : 1 }}>{mode.emoji}</AppText>
          {(soon || isNew(mode)) && (
            <View style={{ position: 'absolute', top: spacing.sm, right: spacing.sm }}>
              <Tag label={soon ? t.common.soon.toUpperCase() : 'NEU'} tone={soon ? 'hot' : 'new'} />
            </View>
          )}
        </LinearGradient>
        <View style={{ padding: spacing.md, gap: 2, backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <AppText variant="subheading" color="text" numberOfLines={1}>
            {mode.title}
          </AppText>
          <AppText variant="caption" color="textFaint" numberOfLines={1}>
            {mode.tagline}
          </AppText>
        </View>
      </Card>
    </PressableScale>
  );
}

/** The first playable mode reads as "new" for a touch of freshness. */
function isNew(mode: GameModeMeta): boolean {
  return mode.id === ALL_MODE_METAS.find((m) => m.status === 'ready')?.id;
}
