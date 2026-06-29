import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { radii, spacing } from '../../../core/design/tokens';
import {
  AppText,
  Avatar,
  Card,
  GameButton,
  Icon,
  ProgressBar,
} from '../../../core/ui';
import { Confetti, Fireworks, CountUp } from '../../../core/fx';
import { Feedback } from '../../../core/services';
import { t } from '../../../core/i18n';
import { groupNumber } from '../../../core/utils/format';
import {
  ACHIEVEMENT_BY_ID,
  levelFromXp,
  rankOutcome,
  type GameOutcome,
  type GameSession,
} from '../../../domain';
import { usePlayerStore, type MatchSummary } from '../../../state';

/**
 * The post-match celebration: winner reveal with confetti/fireworks, animated
 * XP & coin gains, level-up banner, freshly-unlocked achievements and the full
 * ranking — followed by replay / leave.
 */
export function ResultsScreen({
  session,
  outcome,
  summary,
  onPlayAgain,
  onLeave,
}: {
  session: GameSession;
  outcome: GameOutcome;
  summary: MatchSummary;
  onPlayAgain: () => void;
  onLeave: () => void;
}) {
  const result = rankOutcome(session, outcome);
  const xp = usePlayerStore((s) => s.player.xp);
  const lvl = levelFromXp(xp);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    if (result.youWon) Feedback.win();
    else Feedback.lose();
    const id = setTimeout(() => setShowReward(true), 700);
    return () => clearTimeout(id);
  }, [result.youWon]);

  const headline = result.isDraw
    ? t.game.draw
    : result.youWon
      ? t.game.youWin
      : `Platz ${result.yourRank}`;

  return (
    <View style={{ flex: 1 }}>
      {result.youWon && (
        <>
          <Confetti mode="burst" originY={0.32} count={90} />
          <Fireworks bursts={4} />
        </>
      )}

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Headline */}
        <Animated.View entering={ZoomIn.springify().damping(12)} style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <AppText variant="label" color="primaryBright" uppercase>
            {t.game.results}
          </AppText>
          <AppText variant="hero" color={result.youWon ? 'coin' : 'text'} align="center" style={{ fontSize: 46 }}>
            {headline}
          </AppText>
        </Animated.View>

        {/* Podium (top 3) */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: spacing.md }}>
          {orderPodium(result.ranked.slice(0, 3)).map(({ row, place }) => (
            <Animated.View
              key={row.player.id}
              entering={FadeInDown.delay(place * 120).springify().damping(15)}
              style={{ alignItems: 'center' }}
            >
              {place === 0 && <AppText style={{ fontSize: 26 }}>👑</AppText>}
              <Avatar
                emoji={row.player.emoji}
                size={place === 0 ? 76 : 60}
                frame={place === 0 ? ['#FFD23F', '#FF8A3D'] : undefined}
              />
              <AppText variant="caption" color="text" numberOfLines={1} style={{ marginTop: spacing.xs, maxWidth: 84 }}>
                {row.player.isYou ? t.common.you : row.player.name}
              </AppText>
              <AppText variant="bodyStrong" style={{ color: row.player.color }}>
                {row.score}
              </AppText>
              <View
                style={{
                  width: place === 0 ? 64 : 52,
                  height: place === 0 ? 46 : place === 1 ? 32 : 22,
                  borderTopLeftRadius: radii.sm,
                  borderTopRightRadius: radii.sm,
                  backgroundColor: row.player.color + '55',
                  marginTop: spacing.xs,
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  paddingTop: 2,
                }}
              >
                <AppText variant="label" color="text">
                  {place + 1}
                </AppText>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Rewards */}
        {showReward && (
          <Animated.View entering={FadeIn}>
            <Card style={{ gap: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <Reward icon="flash" color="xp" label={t.progression.xp} value={summary.xpGained} />
                <Reward icon="logo-bitcoin" color="coin" label={t.progression.coins} value={summary.coinsGained} />
                {summary.gemsGained > 0 && (
                  <Reward icon="diamond" color="gem" label={t.progression.gems} value={summary.gemsGained} />
                )}
              </View>

              {/* XP bar */}
              <View style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="caption" color="textMuted">
                    {t.common.level} {lvl.level}
                  </AppText>
                  <AppText variant="caption" color="textFaint">
                    {groupNumber(lvl.xpIntoLevel)} / {groupNumber(lvl.xpForThisLevel)} XP
                  </AppText>
                </View>
                <ProgressBar progress={lvl.progress} height={12} />
              </View>

              {summary.leveledUp && (
                <Animated.View entering={ZoomIn.delay(300).springify()}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: spacing.sm,
                      backgroundColor: '#FFD23F22',
                      borderRadius: radii.lg,
                      padding: spacing.md,
                    }}
                  >
                    <Icon name="trending-up" size={20} color="coin" />
                    <AppText variant="subheading" color="coin">
                      {t.progression.levelUp} {t.common.level} {summary.toLevel}
                    </AppText>
                  </View>
                </Animated.View>
              )}

              {summary.unlockedAchievements.map((id) => {
                const ach = ACHIEVEMENT_BY_ID[id];
                if (!ach) return null;
                return (
                  <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Icon name={ach.icon} size={20} color="success" />
                    <AppText variant="caption" color="text">
                      Erfolg freigeschaltet: <AppText variant="caption" color="success">{ach.name}</AppText>
                    </AppText>
                  </View>
                );
              })}
            </Card>
          </Animated.View>
        )}

        {/* Full ranking */}
        {result.ranked.length > 3 && (
          <View style={{ gap: spacing.sm }}>
            {result.ranked.map((row) => (
              <Card
                key={row.player.id}
                padding="md"
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
                alt={row.player.isYou}
              >
                <AppText variant="bodyStrong" color="textFaint" style={{ width: 24 }}>
                  {row.rank}
                </AppText>
                <Avatar emoji={row.player.emoji} size={36} />
                <AppText variant="body" color="text" style={{ flex: 1 }} numberOfLines={1}>
                  {row.player.isYou ? t.common.you : row.player.name}
                </AppText>
                <AppText variant="bodyStrong" style={{ color: row.player.color }}>
                  {row.score}
                </AppText>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={{ padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm }}>
        <GameButton
          label={t.game.playAgain}
          size="lg"
          leftIcon={<Icon name="refresh" size={20} color="onPrimary" />}
          onPress={onPlayAgain}
        />
        <GameButton label={t.game.leave} variant="ghost" size="md" onPress={onLeave} />
      </View>
    </View>
  );
}

/** Reorders [1st,2nd,3rd] into visual podium order [2nd,1st,3rd]. */
function orderPodium<T>(top: T[]): { row: T; place: number }[] {
  const withPlace = top.map((row, place) => ({ row, place }));
  if (withPlace.length < 3) return withPlace;
  return [withPlace[1], withPlace[0], withPlace[2]];
}

function Reward({
  icon,
  color,
  label,
  value,
}: {
  icon: any;
  color: 'xp' | 'coin' | 'gem';
  label: string;
  value: number;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Icon name={icon} size={26} color={color} />
      <CountUp value={value} variant="numeric" color={color} format={(n) => `+${n}`} />
      <AppText variant="label" color="textFaint" uppercase>
        {label}
      </AppText>
    </View>
  );
}
