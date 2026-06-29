import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { radii, spacing } from '../../../core/design/tokens';
import { AppText, GameButton, Icon } from '../../../core/ui';
import { CountUp } from '../../../core/fx';
import { Feedback } from '../../../core/services';
import { t } from '../../../core/i18n';
import { Rng } from '../../../core/utils/random';
import { groupNumber } from '../../../core/utils/format';
import type { GamePlayer, GameplayProps } from '../../../domain';
import { GameTopBar } from '../shared/GameTopBar';
import { PlayerHandoff } from '../shared/PlayerHandoff';
import { HL_CATEGORIES } from './data/categories';
import type { HLCategory, HLItem } from './types';

type Phase = 'handoff' | 'play';

export function HigherLower({ session, onComplete, onQuit }: GameplayProps) {
  const { players, config } = session;
  const humans = useMemo(() => players.filter((p) => !p.isBot), [players]);
  const bots = useMemo(() => players.filter((p) => p.isBot), [players]);
  const rng = useMemo(() => new Rng(session.seed), [session.seed]);
  const guesses = config.rounds;

  const [humanIndex, setHumanIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(humans.length > 1 ? 'handoff' : 'play');
  const [turnKey, setTurnKey] = useState(0);

  const totals = useMemo<Record<string, number>>(
    () => Object.fromEntries(players.map((p) => [p.id, 0])),
    [players],
  );

  const category = useMemo<HLCategory>(() => {
    const chosen = config.options?.category as string | undefined;
    const found = chosen && chosen !== 'random' ? HL_CATEGORIES.find((c) => c.id === chosen) : undefined;
    return found ?? rng.pick(HL_CATEGORIES)!;
    // new category each turn when random
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnKey]);

  const sequence = useMemo<HLItem[]>(
    () => rng.sample(category.items, guesses + 1),
    [category, guesses, rng],
  );

  const currentHuman = humans[humanIndex];

  const endTurn = (score: number) => {
    totals[currentHuman.id] = score;
    if (humanIndex < humans.length - 1) {
      setHumanIndex(humanIndex + 1);
      setTurnKey((k) => k + 1);
      setPhase('handoff');
    } else {
      // Simulate bot scores, then finish.
      bots.forEach((b) => {
        let s = 0;
        for (let i = 0; i < guesses; i++) if (rng.chance(b.botSkill ?? 0.7)) s += 1;
        totals[b.id] = s;
      });
      const you = players.find((p) => p.isYou);
      onComplete({
        scores: players.map((p) => ({ playerId: p.id, score: totals[p.id] })),
        correctAnswers: you ? totals[you.id] : 0,
        perfect: you ? totals[you.id] === guesses : false,
        rounds: guesses,
      });
    }
  };

  if (phase === 'handoff') {
    return (
      <View style={{ flex: 1 }}>
        <GameTopBar title={session.mode.title} onQuit={onQuit} />
        <PlayerHandoff player={currentHuman} hint={category.question} onReady={() => setPhase('play')} />
      </View>
    );
  }

  return (
    <Turn
      key={turnKey}
      category={category}
      sequence={sequence}
      guesses={guesses}
      player={currentHuman}
      mode={session.mode.title}
      onQuit={onQuit}
      onEnd={endTurn}
    />
  );
}

function Turn({
  category,
  sequence,
  guesses,
  player,
  mode,
  onQuit,
  onEnd,
}: {
  category: HLCategory;
  sequence: HLItem[];
  guesses: number;
  player: GamePlayer;
  mode: string;
  onQuit: () => void;
  onEnd: (score: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const a = sequence[idx];
  const b = sequence[idx + 1];

  const guess = (higher: boolean) => {
    if (revealed || !b) return;
    const actualHigher = b.value >= a.value;
    const correct = higher === actualHigher;
    setLastCorrect(correct);
    setRevealed(true);
    if (correct) {
      Feedback.success();
      setScore((s) => s + 1);
    } else {
      Feedback.error();
    }
    setTimeout(() => {
      const nextIdx = idx + 1;
      if (nextIdx >= guesses) {
        onEnd(score + (correct ? 1 : 0));
      } else {
        setIdx(nextIdx);
        setRevealed(false);
        setLastCorrect(null);
      }
    }, 1300);
  };

  return (
    <View style={{ flex: 1 }}>
      <GameTopBar
        title={mode}
        subtitle={`${player.name} · ${idx + 1}/${guesses}`}
        onQuit={onQuit}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="star" size={16} color="coin" />
            <AppText variant="bodyStrong" color="coin">
              {score}
            </AppText>
          </View>
        }
      />

      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
        {/* Item A — known */}
        <ItemPanel item={a} unit={category.unit} showValue gradient={['#1C1147', '#271861']} />

        {/* VS divider */}
        <View style={{ alignItems: 'center', marginVertical: -spacing.lg, zIndex: 2 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#0B0720',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.16)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="caption" color="text">
              VS
            </AppText>
          </View>
        </View>

        {/* Item B — guess */}
        <ItemPanel
          item={b}
          unit={category.unit}
          showValue={revealed}
          gradient={
            revealed
              ? lastCorrect
                ? ['#15A85A', '#0E7A41']
                : ['#D62b48', '#8E1B30']
              : ['#3A2466', '#1C1147']
          }
          question={category.question}
          footer={
            !revealed ? (
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <GameButton
                    label="Höher"
                    variant="success"
                    leftIcon={<Icon name="arrow-up" size={20} color="onColor" />}
                    onPress={() => guess(true)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <GameButton
                    label="Tiefer"
                    variant="danger"
                    leftIcon={<Icon name="arrow-down" size={20} color="onColor" />}
                    onPress={() => guess(false)}
                  />
                </View>
              </View>
            ) : (
              <Animated.View entering={ZoomIn} style={{ marginTop: spacing.sm }}>
                <AppText variant="heading" color="onColor" align="center">
                  {lastCorrect ? 'Richtig! 🎉' : 'Daneben!'}
                </AppText>
              </Animated.View>
            )
          }
        />
      </View>
    </View>
  );
}

function ItemPanel({
  item,
  unit,
  showValue,
  gradient,
  question,
  footer,
}: {
  item: HLItem;
  unit: string;
  showValue: boolean;
  gradient: readonly [string, string, ...string[]];
  question?: string;
  footer?: React.ReactNode;
}) {
  return (
    <LinearGradient colors={gradient} style={{ flex: 1, borderRadius: radii.xl, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' }}>
      <AppText style={{ fontSize: 52 }}>{item.emoji ?? '❓'}</AppText>
      <AppText variant="heading" color="onColor" align="center" numberOfLines={2}>
        {item.label}
      </AppText>
      {question && !showValue && (
        <AppText variant="caption" color="onColor" align="center" dim style={{ marginTop: spacing.xs }}>
          {question}
        </AppText>
      )}
      {showValue ? (
        <Animated.View entering={FadeIn} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: spacing.sm }}>
          <CountUp value={Math.round(item.value)} variant="numeric" color="onColor" format={(n) => groupNumber(n)} />
          <AppText variant="subheading" color="onColor" dim>
            {unit}
          </AppText>
        </Animated.View>
      ) : (
        <AppText variant="numeric" color="onColor" dim style={{ marginTop: spacing.sm }}>
          ?
        </AppText>
      )}
      {footer}
    </LinearGradient>
  );
}
