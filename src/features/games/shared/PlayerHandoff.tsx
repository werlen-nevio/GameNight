import { type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { spacing } from '../../../core/design/tokens';
import { AppText, Avatar, GameButton, Icon } from '../../../core/ui';
import { t } from '../../../core/i18n';
import type { GamePlayer } from '../../../domain';

/**
 * The "pass the device" screen shown between turns in local multiplayer modes,
 * so the next player can take over without seeing the previous answers.
 */
export function PlayerHandoff({
  player,
  hint,
  extra,
  onReady,
}: {
  player: GamePlayer;
  hint?: string;
  extra?: ReactNode;
  onReady: () => void;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xl }}>
      <Animated.View entering={ZoomIn.springify().damping(13)} style={{ alignItems: 'center', gap: spacing.md }}>
        <Avatar emoji={player.emoji} size={104} frame={['#9D5CFF', '#FF4D8D']} />
        <AppText variant="label" color="textFaint" uppercase>
          {t.game.yourTurn}
        </AppText>
        <AppText variant="title" color="text">
          {player.name}
        </AppText>
        {hint && (
          <AppText variant="body" color="textMuted" align="center">
            {hint}
          </AppText>
        )}
        {extra}
      </Animated.View>
      <View style={{ alignSelf: 'stretch' }}>
        <GameButton
          label={t.game.ready}
          size="lg"
          leftIcon={<Icon name="play" size={22} color="onPrimary" />}
          onPress={onReady}
        />
      </View>
    </View>
  );
}
