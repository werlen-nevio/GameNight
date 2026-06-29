import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { radii, spacing } from '../../../core/design/tokens';
import { useTheme } from '../../../core/design/ThemeProvider';
import {
  AppText,
  Avatar,
  Card,
  GameButton,
  Icon,
} from '../../../core/ui';
import { Feedback } from '../../../core/services';
import { t } from '../../../core/i18n';
import { Rng } from '../../../core/utils/random';
import { useCountdown } from '../../../core/hooks/useCountdown';
import type { GamePlayer, GameplayProps } from '../../../domain';
import { GameTopBar } from '../shared/GameTopBar';
import { TimerRing } from '../shared/TimerRing';
import { SLF_CATEGORY_BY_ID } from './data/categories';
import {
  buildRounds,
  pickCategories,
  scoreRound,
  type RoundScore,
  type SlfRound,
} from './logic';
import type { SlfPack } from './types';

type Phase = 'handoff' | 'fill' | 'reveal';

/** Stadt Land Fluss — local pass-and-play + solo vs KI with automatic scoring. */
export function StadtLandFluss({ session, onComplete, onQuit }: GameplayProps) {
  const theme = useTheme();
  const { players, config } = session;
  const humans = useMemo(() => players.filter((p) => !p.isBot), [players]);

  const rng = useMemo(() => new Rng(session.seed), [session.seed]);
  const rounds = useMemo<SlfRound[]>(() => {
    const opts = config.options ?? {};
    const categories = pickCategories({
      count: (opts.count as number) ?? 6,
      packs: (opts.packs as SlfPack[] | 'all') ?? 'all',
      difficulty: config.difficulty,
      rng,
    });
    return buildRounds({ rounds: config.rounds, categories, rng });
  }, [config, rng]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(humans.length > 1 ? 'handoff' : 'fill');
  const [humanIndex, setHumanIndex] = useState(0);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [roundScore, setRoundScore] = useState<RoundScore | null>(null);

  const totalsRef = useRef<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p.id, 0])),
  );
  const roundAnswersRef = useRef<Record<string, Record<string, string>>>({});
  const yourCorrectRef = useRef(0);

  const round = rounds[roundIndex];
  const currentHuman = humans[humanIndex];

  const timer = useCountdown(config.timeLimit, {
    autoStart: false,
    onComplete: () => submitHuman(),
  });

  function startFill() {
    setDraft({});
    timer.reset(config.timeLimit);
    timer.start();
    setPhase('fill');
  }

  function submitHuman() {
    timer.pause();
    roundAnswersRef.current[currentHuman.id] = draft;
    Feedback.whoosh();
    if (humanIndex < humans.length - 1) {
      setHumanIndex(humanIndex + 1);
      setPhase('handoff');
    } else {
      finishRound();
    }
  }

  function finishRound() {
    const score = scoreRound(round, roundAnswersRef.current, players, rng);
    players.forEach((p) => (totalsRef.current[p.id] += score.byPlayer[p.id] ?? 0));
    // Track your correct answers for progression.
    const you = players.find((p) => p.isYou);
    if (you) {
      for (const line of score.lines) {
        if (line.results[you.id]?.valid) yourCorrectRef.current += 1;
      }
    }
    setRoundScore(score);
    Feedback.reveal();
    setPhase('reveal');
  }

  function nextRound() {
    if (roundIndex < rounds.length - 1) {
      roundAnswersRef.current = {};
      setHumanIndex(0);
      setRoundIndex(roundIndex + 1);
      setRoundScore(null);
      setPhase(humans.length > 1 ? 'handoff' : 'fill');
    } else {
      const totalCats = rounds.length * round.categories.length;
      onComplete({
        scores: players.map((p) => ({ playerId: p.id, score: totalsRef.current[p.id] })),
        correctAnswers: yourCorrectRef.current,
        perfect: yourCorrectRef.current === totalCats,
        rounds: rounds.length,
      });
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <GameTopBar
        title={session.mode.title}
        subtitle={`${t.common.round} ${roundIndex + 1}/${rounds.length}`}
        onQuit={onQuit}
        right={phase === 'fill' ? <TimerRing remaining={timer.remaining} total={config.timeLimit} size={52} /> : undefined}
      />

      {phase === 'handoff' && (
        <Handoff player={currentHuman} letter={round.letter} onReady={startFill} />
      )}

      {phase === 'fill' && (
        <FillScreen
          letter={round.letter}
          categories={round.categories.map((c) => c.id)}
          draft={draft}
          onChange={(id, val) => setDraft((d) => ({ ...d, [id]: val }))}
          onSubmit={submitHuman}
          soloHint={humans.length === 1}
        />
      )}

      {phase === 'reveal' && roundScore && (
        <RevealScreen
          round={round}
          score={roundScore}
          players={players}
          totals={totalsRef.current}
          isLast={roundIndex === rounds.length - 1}
          onNext={nextRound}
        />
      )}
    </View>
  );
}

/* ---------------------------------------------------------------- Handoff */

function Handoff({
  player,
  letter,
  onReady,
}: {
  player: GamePlayer;
  letter: string;
  onReady: () => void;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
      <Animated.View entering={ZoomIn.springify().damping(13)} style={{ alignItems: 'center', gap: spacing.md }}>
        <Avatar emoji={player.emoji} size={96} frame={['#9D5CFF', '#FF4D8D']} />
        <AppText variant="label" color="textFaint" uppercase>
          {t.game.yourTurn}
        </AppText>
        <AppText variant="title" color="text">
          {player.name}
        </AppText>
        <AppText variant="body" color="textMuted" align="center">
          Buchstabe dieser Runde
        </AppText>
        <AppText variant="hero" color="primaryBright" style={{ fontSize: 100 }}>
          {letter}
        </AppText>
      </Animated.View>
      <View style={{ alignSelf: 'stretch' }}>
        <GameButton label={t.game.ready} size="lg" leftIcon={<Icon name="play" size={22} color="onPrimary" />} onPress={onReady} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------- Fill */

function FillScreen({
  letter,
  categories,
  draft,
  onChange,
  onSubmit,
  soloHint,
}: {
  letter: string;
  categories: string[];
  draft: Record<string, string>;
  onChange: (id: string, value: string) => void;
  onSubmit: () => void;
  soloHint: boolean;
}) {
  const theme = useTheme();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={8}
    >
      <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
        <AppText variant="label" color="textFaint" uppercase>
          Begriffe mit
        </AppText>
        <AppText variant="display" color="primaryBright" style={{ fontSize: 56 }}>
          {letter}
        </AppText>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {categories.map((id, i) => {
          const cat = SLF_CATEGORY_BY_ID[id];
          return (
            <Animated.View key={id} entering={FadeInDown.delay(i * 40)}>
              <Card padding="md" style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <AppText style={{ fontSize: 20 }}>{cat?.emoji}</AppText>
                  <AppText variant="caption" color="textMuted">
                    {cat?.name}
                  </AppText>
                </View>
                <TextInput
                  value={draft[id] ?? ''}
                  onChangeText={(v) => onChange(id, v)}
                  placeholder={`${letter}…`}
                  placeholderTextColor={theme.colors.textFaint}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={{
                    color: theme.colors.text,
                    fontFamily: 'Nunito_700Bold',
                    fontSize: 18,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    borderRadius: radii.md,
                  }}
                />
              </Card>
            </Animated.View>
          );
        })}
        {soloHint && (
          <AppText variant="caption" color="textFaint" align="center">
            Tipp: Jeder gültige Begriff zählt – sei schneller als die KI!
          </AppText>
        )}
      </ScrollView>
      <View style={{ padding: spacing.xl, paddingTop: spacing.sm }}>
        <GameButton
          label={t.common.done}
          variant="success"
          size="lg"
          leftIcon={<Icon name="checkmark" size={22} color="onColor" />}
          onPress={onSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

/* ----------------------------------------------------------------- Reveal */

function RevealScreen({
  round,
  score,
  players,
  totals,
  isLast,
  onNext,
}: {
  round: SlfRound;
  score: RoundScore;
  players: GamePlayer[];
  totals: Record<string, number>;
  isLast: boolean;
  onNext: () => void;
}) {
  const ranked = [...players].sort((a, b) => totals[b.id] - totals[a.id]);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="heading" color="text" align="center">
          Auflösung – Buchstabe {round.letter}
        </AppText>

        {/* Standings */}
        <Card style={{ gap: spacing.sm }}>
          {ranked.map((p, i) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <AppText variant="caption" color="textFaint" style={{ width: 18 }}>
                {i + 1}
              </AppText>
              <Avatar emoji={p.emoji} size={28} />
              <AppText variant="body" color="text" style={{ flex: 1 }} numberOfLines={1}>
                {p.isYou ? t.common.you : p.name}
              </AppText>
              <AppText variant="bodyStrong" style={{ color: p.color }}>
                {totals[p.id]}
              </AppText>
            </View>
          ))}
        </Card>

        {/* Category breakdown */}
        <View style={{ gap: spacing.sm }}>
          {score.lines.map((line) => {
            const cat = SLF_CATEGORY_BY_ID[line.categoryId];
            return (
              <Animated.View key={line.categoryId} entering={FadeIn}>
                <Card padding="md" alt style={{ gap: spacing.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <AppText style={{ fontSize: 16 }}>{cat?.emoji}</AppText>
                    <AppText variant="caption" color="textMuted">
                      {cat?.name}
                    </AppText>
                  </View>
                  {players.map((p) => {
                    const r = line.results[p.id];
                    if (!r) return null;
                    return (
                      <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <AppText variant="caption" style={{ color: p.color, width: 70 }} numberOfLines={1}>
                          {p.isYou ? t.common.you : p.name}
                        </AppText>
                        <AppText variant="caption" color={r.valid ? 'text' : 'textFaint'} style={{ flex: 1 }} numberOfLines={1}>
                          {r.answer || '—'}
                        </AppText>
                        <AppText
                          variant="caption"
                          color={r.points >= 20 ? 'success' : r.points > 0 ? 'text' : 'textFaint'}
                        >
                          +{r.points}
                        </AppText>
                      </View>
                    );
                  })}
                </Card>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
      <View style={{ padding: spacing.xl, paddingTop: spacing.sm }}>
        <GameButton
          label={isLast ? t.game.results : t.common.next}
          size="lg"
          rightIcon={<Icon name="arrow-forward" size={20} color="onPrimary" />}
          onPress={onNext}
        />
      </View>
    </View>
  );
}
