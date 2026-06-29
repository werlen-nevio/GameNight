import { useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { palette, radii, spacing } from '../../../core/design/tokens';
import { AppText, Card, GameButton, Icon, PressableScale } from '../../../core/ui';
import { Feedback } from '../../../core/services';
import { t } from '../../../core/i18n';
import { Rng } from '../../../core/utils/random';
import { groupNumber } from '../../../core/utils/format';
import type { GameplayProps } from '../../../domain';
import { GameTopBar } from '../shared/GameTopBar';
import { buildLadder, MILLIONAIRE_QUESTIONS } from './data/questions';
import { PRIZE_LADDER, SAFE_HAVENS, type MillionaireQuestion } from './types';
import { audienceVote, bankedPrize, fiftyFiftyRemovals, phoneHint, safeFloor } from './logic';

const LETTERS = ['A', 'B', 'C', 'D'];
const MILLION = PRIZE_LADDER[PRIZE_LADDER.length - 1];

export function Millionaire({ session, onComplete, onQuit }: GameplayProps) {
  const rng = useMemo(() => new Rng(session.seed), [session.seed]);
  const you = session.players[0];

  const [ladder, setLadder] = useState<MillionaireQuestion[]>(() => buildLadder(session.seed));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [removed, setRemoved] = useState<number[]>([]);
  const [used, setUsed] = useState<Record<string, boolean>>({});
  const [audience, setAudience] = useState<Record<number, number> | null>(null);
  const [phone, setPhone] = useState<{ pick: number; text: string } | null>(null);
  const correctCount = useRef(0);

  const q = ladder[index];
  const available = [0, 1, 2, 3].filter((i) => !removed.includes(i));

  const finish = (prize: number) => {
    onComplete({
      scores: [{ playerId: you.id, score: prize }],
      correctAnswers: correctCount.current,
      perfect: prize >= MILLION,
      rounds: 15,
    });
  };

  const lockIn = () => {
    if (selected === null || locked) return;
    setLocked(true);
    Feedback.tick();
    setTimeout(() => {
      const correct = selected === q.correct;
      setReveal(true);
      if (correct) {
        correctCount.current += 1;
        Feedback.success();
      } else {
        Feedback.error();
      }
      setTimeout(() => {
        if (correct) {
          if (index === ladder.length - 1) {
            finish(MILLION);
          } else {
            setIndex(index + 1);
            resetQuestion();
          }
        } else {
          finish(safeFloor(index));
        }
      }, 1900);
    }, 1500);
  };

  const resetQuestion = () => {
    setSelected(null);
    setLocked(false);
    setReveal(false);
    setRemoved([]);
    setAudience(null);
    setPhone(null);
  };

  const useFifty = () => {
    if (used.fifty) return;
    const rem = fiftyFiftyRemovals(q, rng);
    setRemoved(rem);
    if (selected !== null && rem.includes(selected)) setSelected(null);
    setUsed((u) => ({ ...u, fifty: true }));
    Feedback.whoosh();
  };

  const useAudience = () => {
    if (used.audience) return;
    setAudience(audienceVote(q, available, rng));
    setPhone(null);
    setUsed((u) => ({ ...u, audience: true }));
    Feedback.reveal();
  };

  const usePhone = () => {
    if (used.phone) return;
    setPhone(phoneHint(q, available, rng));
    setAudience(null);
    setUsed((u) => ({ ...u, phone: true }));
    Feedback.reveal();
  };

  const useSwap = () => {
    if (used.swap) return;
    const inLadder = new Set(ladder.map((x) => x.id));
    const candidate = MILLIONAIRE_QUESTIONS.find((x) => x.tier === q.tier && !inLadder.has(x.id));
    if (candidate) {
      const next = ladder.slice();
      next[index] = candidate;
      setLadder(next);
      resetQuestion();
    }
    setUsed((u) => ({ ...u, swap: true }));
    Feedback.whoosh();
  };

  const optionState = (i: number): 'removed' | 'correct' | 'wrong' | 'selected' | 'idle' => {
    if (removed.includes(i)) return 'removed';
    if (reveal && i === q.correct) return 'correct';
    if (reveal && i === selected) return 'wrong';
    if (selected === i) return 'selected';
    return 'idle';
  };

  return (
    <View style={{ flex: 1 }}>
      <GameTopBar title="Wer wird Millionär" subtitle={`Frage ${index + 1}/15`} onQuit={onQuit} />

      {/* Prize rail */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.xs, paddingVertical: spacing.sm }}
      >
        {PRIZE_LADDER.map((prize, i) => {
          const isCurrent = i === index;
          const passed = i < index;
          const safe = (SAFE_HAVENS as readonly number[]).includes(i);
          return (
            <View
              key={i}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: radii.pill,
                backgroundColor: isCurrent ? palette.gold : passed ? 'rgba(43,213,118,0.18)' : 'rgba(255,255,255,0.06)',
                borderWidth: safe ? 1.5 : 0,
                borderColor: palette.gold,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <AppText variant="label" style={{ color: isCurrent ? '#3A2A00' : passed ? palette.green : palette.mist }}>
                {i + 1}
              </AppText>
              {safe && <Icon name="shield-checkmark" size={11} color={isCurrent ? ('#3A2A00' as string) : palette.gold} />}
            </View>
          );
        })}
      </ScrollView>

      <View style={{ alignItems: 'center', paddingBottom: spacing.sm }}>
        <AppText variant="hero" color="coin" style={{ fontSize: 30 }}>
          {groupNumber(PRIZE_LADDER[index])} €
        </AppText>
        <AppText variant="caption" color="textFaint">
          Sicher: {groupNumber(safeFloor(index))} €
        </AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.md }} showsVerticalScrollIndicator={false}>
        {/* Question */}
        <LinearGradient colors={['#2A4BA0', '#10245E']} style={{ borderRadius: radii.xl, padding: spacing.xl, borderWidth: 1, borderColor: 'rgba(255,210,63,0.4)' }}>
          <AppText variant="subheading" color="onColor" align="center">
            {q.question}
          </AppText>
        </LinearGradient>

        {/* Joker result panel */}
        {audience && (
          <Animated.View entering={FadeIn}>
            <Card alt style={{ gap: spacing.sm }}>
              <AppText variant="caption" color="textMuted">
                Publikumsjoker
              </AppText>
              {available.map((i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <AppText variant="caption" color="textFaint" style={{ width: 16 }}>
                    {LETTERS[i]}
                  </AppText>
                  <View style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                    <View style={{ width: `${audience[i] ?? 0}%`, height: '100%', backgroundColor: palette.gold, borderRadius: 7 }} />
                  </View>
                  <AppText variant="caption" color="text" style={{ width: 38, textAlign: 'right' }}>
                    {audience[i] ?? 0}%
                  </AppText>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}
        {phone && (
          <Animated.View entering={FadeIn}>
            <Card alt style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="call" size={20} color="gem" />
              <AppText variant="body" color="text" style={{ flex: 1 }}>
                {phone.text}
              </AppText>
            </Card>
          </Animated.View>
        )}

        {/* Answers */}
        <View style={{ gap: spacing.sm }}>
          {[0, 1, 2, 3].map((i) => {
            const st = optionState(i);
            return (
              <Animated.View key={i} entering={FadeInDown.delay(i * 50)}>
                <AnswerOption
                  letter={LETTERS[i]}
                  text={q.answers[i]}
                  state={st}
                  onPress={() => {
                    if (st === 'removed' || locked) return;
                    setSelected(i);
                    Feedback.select();
                  }}
                />
              </Animated.View>
            );
          })}
        </View>

        {/* Jokers */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.sm }}>
          <Joker icon="contract" label="50:50" used={!!used.fifty} disabled={locked} onPress={useFifty} />
          <Joker icon="people" label="Publikum" used={!!used.audience} disabled={locked} onPress={useAudience} />
          <Joker icon="call" label="Telefon" used={!!used.phone} disabled={locked} onPress={usePhone} />
          <Joker icon="swap-horizontal" label="Tausch" used={!!used.swap} disabled={locked} onPress={useSwap} />
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={{ padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm }}>
        <GameButton
          label={locked ? 'Loggen …' : 'Loggen'}
          variant="coin"
          size="lg"
          disabled={selected === null || locked}
          leftIcon={<Icon name="lock-closed" size={20} color="#3A2A00" />}
          onPress={lockIn}
        />
        {index > 0 && !locked && (
          <GameButton
            label={`Aussteigen (${groupNumber(bankedPrize(index))} €)`}
            variant="ghost"
            size="md"
            onPress={() => finish(bankedPrize(index))}
          />
        )}
      </View>
    </View>
  );
}

function AnswerOption({
  letter,
  text,
  state,
  onPress,
}: {
  letter: string;
  text: string;
  state: 'removed' | 'correct' | 'wrong' | 'selected' | 'idle';
  onPress: () => void;
}) {
  const colors: Record<typeof state, readonly [string, string]> = {
    idle: ['#16306E', '#0D1F4A'],
    selected: ['#FF8A3D', '#E0721B'],
    correct: ['#2BD576', '#15A85A'],
    wrong: ['#FF5470', '#D62b48'],
    removed: ['#0D1430', '#0D1430'],
  };
  const dim = state === 'removed';
  const textColor = state === 'selected' || state === 'correct' || state === 'wrong' ? '#0A0614' : palette.cloud;

  return (
    <PressableScale feedback={null} onPress={onPress} disabled={dim} scaleTo={0.97}>
      <LinearGradient
        colors={colors[state]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.pill,
          borderWidth: 1.5,
          borderColor: 'rgba(255,210,63,0.35)',
          opacity: dim ? 0.3 : 1,
        }}
      >
        <AppText variant="button" style={{ color: state === 'idle' ? palette.gold : textColor }}>
          {letter}:
        </AppText>
        <AppText variant="bodyStrong" style={{ color: textColor, flex: 1 }} numberOfLines={2}>
          {dim ? '' : text}
        </AppText>
      </LinearGradient>
    </PressableScale>
  );
}

function Joker({
  icon,
  label,
  used,
  disabled,
  onPress,
}: {
  icon: any;
  label: string;
  used: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale feedback="tap" onPress={onPress} disabled={used || disabled} scaleTo={0.9} style={{ alignItems: 'center', gap: 4, opacity: used ? 0.35 : 1 }}>
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: 'rgba(255,210,63,0.14)',
          borderWidth: 1.5,
          borderColor: palette.gold,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={24} color={used ? 'textFaint' : 'coin'} />
      </View>
      <AppText variant="label" color={used ? 'textFaint' : 'text'}>
        {label}
      </AppText>
    </PressableScale>
  );
}
