import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { radii, spacing } from '../../../core/design/tokens';
import { AppText, Card, GameButton, Icon, PressableScale } from '../../../core/ui';
import { CountUp } from '../../../core/fx';
import { Feedback } from '../../../core/services';
import { t } from '../../../core/i18n';
import { Rng } from '../../../core/utils/random';
import { clamp, groupNumber } from '../../../core/utils/format';
import type { GamePlayer, GameplayProps } from '../../../domain';
import { GameTopBar } from '../shared/GameTopBar';
import { PlayerHandoff } from '../shared/PlayerHandoff';
import { PRICE_ITEMS, type PriceItem } from './data';

/** Normalized closeness score (0..1) for a guess vs the real price. */
function closeness(guess: number, actual: number): number {
  if (guess <= 0) return 0;
  const err = Math.abs(guess - actual) / actual;
  if (err <= 0.05) return 1;
  return clamp(1 - err, 0, 1);
}

export function GuessPrice({ session, onComplete, onQuit }: GameplayProps) {
  const { players, config } = session;
  const humans = useMemo(() => players.filter((p) => !p.isBot), [players]);
  const bots = useMemo(() => players.filter((p) => p.isBot), [players]);
  const rng = useMemo(() => new Rng(session.seed), [session.seed]);
  const items = useMemo(() => rng.sample(PRICE_ITEMS, config.rounds), [rng, config.rounds]);

  const [humanIndex, setHumanIndex] = useState(0);
  const [phase, setPhase] = useState<'handoff' | 'play'>(humans.length > 1 ? 'handoff' : 'play');
  const totals = useRef<Record<string, number>>(Object.fromEntries(players.map((p) => [p.id, 0])));
  const yourScore = useRef(0);

  const currentHuman = humans[humanIndex];

  const endTurn = (score: number) => {
    totals.current[currentHuman.id] = score;
    if (currentHuman.isYou) yourScore.current = score;
    if (humanIndex < humans.length - 1) {
      setHumanIndex(humanIndex + 1);
      setPhase('handoff');
    } else {
      bots.forEach((b) => {
        let s = 0;
        items.forEach((it) => {
          // Bots guess within a skill-based band around the true price.
          const spread = (1 - (b.botSkill ?? 0.7)) * 0.6 + 0.05;
          const guess = it.price * (1 + (rng.float() - 0.5) * 2 * spread);
          s += Math.round(closeness(guess, it.price) * 100);
        });
        totals.current[b.id] = s;
      });
      const maxScore = items.length * 100;
      onComplete({
        scores: players.map((p) => ({ playerId: p.id, score: totals.current[p.id] })),
        correctAnswers: Math.round((yourScore.current / maxScore) * items.length),
        perfect: yourScore.current >= maxScore - items.length, // allow rounding slack
        rounds: items.length,
      });
    }
  };

  if (phase === 'handoff') {
    return (
      <View style={{ flex: 1 }}>
        <GameTopBar title={session.mode.title} onQuit={onQuit} />
        <PlayerHandoff player={currentHuman} hint="Schätze die Preise so genau wie möglich!" onReady={() => setPhase('play')} />
      </View>
    );
  }

  return (
    <Turn
      key={humanIndex}
      items={items}
      player={currentHuman}
      mode={session.mode.title}
      onQuit={onQuit}
      onEnd={endTurn}
    />
  );
}

function Turn({
  items,
  player,
  mode,
  onQuit,
  onEnd,
}: {
  items: PriceItem[];
  player: GamePlayer;
  mode: string;
  onQuit: () => void;
  onEnd: (score: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [entry, setEntry] = useState('');
  const [revealed, setRevealed] = useState(false);
  const score = useRef(0);
  const [lastPoints, setLastPoints] = useState(0);

  const item = items[idx];
  const guessValue = parseInt(entry || '0', 10);

  const press = (d: string) => {
    if (revealed) return;
    if (d === 'del') {
      setEntry((e) => e.slice(0, -1));
      Feedback.tap();
      return;
    }
    if (entry.length >= 7) return;
    setEntry((e) => e + d);
    Feedback.tap();
  };

  const submit = () => {
    if (revealed || entry.length === 0) return;
    const pts = Math.round(closeness(guessValue, item.price) * 100);
    score.current += pts;
    setLastPoints(pts);
    setRevealed(true);
    if (pts >= 80) Feedback.success();
    else if (pts >= 40) Feedback.coin();
    else Feedback.error();
    setTimeout(() => {
      if (idx < items.length - 1) {
        setIdx(idx + 1);
        setEntry('');
        setRevealed(false);
      } else {
        onEnd(score.current);
      }
    }, 1800);
  };

  return (
    <View style={{ flex: 1 }}>
      <GameTopBar
        title={mode}
        subtitle={`${player.name} · ${idx + 1}/${items.length}`}
        onQuit={onQuit}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="star" size={16} color="coin" />
            <AppText variant="bodyStrong" color="coin">
              {score.current}
            </AppText>
          </View>
        }
      />

      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
        {/* Product */}
        <LinearGradient colors={['#1C1147', '#271861']} style={{ borderRadius: radii.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.xs }}>
          <AppText style={{ fontSize: 64 }}>{item.emoji}</AppText>
          <AppText variant="heading" color="text" align="center">
            {item.name}
          </AppText>
        </LinearGradient>

        {/* Entry / reveal */}
        {revealed ? (
          <Animated.View entering={ZoomIn} style={{ alignItems: 'center', gap: spacing.xs }}>
            <AppText variant="caption" color="textFaint" uppercase>
              Echter Preis
            </AppText>
            <AppText variant="hero" color="success" style={{ fontSize: 44 }}>
              {item.price.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
            </AppText>
            <AppText variant="body" color="textMuted">
              Dein Tipp: {groupNumber(guessValue)} €
            </AppText>
            <CountUp value={lastPoints} variant="numeric" color="coin" format={(n) => `+${n}`} />
          </Animated.View>
        ) : (
          <>
            <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
              <AppText variant="hero" color="primaryBright" style={{ fontSize: 44 }}>
                {entry ? groupNumber(guessValue) : '0'} €
              </AppText>
            </View>
            <Keypad onPress={press} onSubmit={submit} canSubmit={entry.length > 0} />
          </>
        )}
      </View>
    </View>
  );
}

function Keypad({ onPress, onSubmit, canSubmit }: { onPress: (d: string) => void; onSubmit: () => void; canSubmit: boolean }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0'];
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
        {keys.map((k) => (
          <PressableScale key={k} feedback={null} onPress={() => onPress(k)} style={{ width: '30%' }}>
            <Card padding="md" alt style={{ alignItems: 'center' }}>
              {k === 'del' ? (
                <Icon name="backspace" size={24} color="textMuted" />
              ) : (
                <AppText variant="title" color="text">
                  {k}
                </AppText>
              )}
            </Card>
          </PressableScale>
        ))}
      </View>
      <GameButton
        label="Tipp abgeben"
        variant="success"
        size="md"
        disabled={!canSubmit}
        leftIcon={<Icon name="cash" size={20} color="onColor" />}
        onPress={onSubmit}
      />
    </View>
  );
}
