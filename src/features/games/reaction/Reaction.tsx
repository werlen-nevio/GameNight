import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { radii, spacing } from '../../../core/design/tokens';
import { AppText, Icon } from '../../../core/ui';
import { Feedback } from '../../../core/services';
import { Rng } from '../../../core/utils/random';
import type { GameplayProps } from '../../../domain';
import { GameTopBar } from '../shared/GameTopBar';
import { PlayerHandoff } from '../shared/PlayerHandoff';
import { MINI_GAMES } from './minigames';

type Phase = 'handoff' | 'intro' | 'play';

/** Schlag den Raab — a sequence of quick minigames, scored 0–100 each. */
export function Reaction({ session, onComplete, onQuit }: GameplayProps) {
  const { players, config } = session;
  const humans = useMemo(() => players.filter((p) => !p.isBot), [players]);
  const bots = useMemo(() => players.filter((p) => p.isBot), [players]);
  const rng = useMemo(() => new Rng(session.seed), [session.seed]);
  const games = useMemo(() => rng.sample(MINI_GAMES, Math.min(config.rounds, MINI_GAMES.length)), [config.rounds, rng]);

  const [humanIndex, setHumanIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(humans.length > 1 ? 'handoff' : 'intro');
  const [gameIndex, setGameIndex] = useState(0);
  const [turnScore, setTurnScore] = useState(0);

  const totals = useRef<Record<string, number>>(Object.fromEntries(players.map((p) => [p.id, 0])));
  const yourBest = useRef(0);

  const currentHuman = humans[humanIndex];
  const game = games[gameIndex];

  useEffect(() => {
    if (phase !== 'intro') return;
    const id = setTimeout(() => setPhase('play'), 1500);
    return () => clearTimeout(id);
  }, [phase, gameIndex, humanIndex]);

  const onResult = (norm: number) => {
    const pts = Math.round(norm * 100);
    const newTurnScore = turnScore + pts;
    setTurnScore(newTurnScore);
    Feedback.reveal();
    if (gameIndex < games.length - 1) {
      setGameIndex(gameIndex + 1);
      setPhase('intro');
    } else {
      // End of this player's turn.
      totals.current[currentHuman.id] = newTurnScore;
      if (currentHuman.isYou) yourBest.current = newTurnScore;
      if (humanIndex < humans.length - 1) {
        setHumanIndex(humanIndex + 1);
        setGameIndex(0);
        setTurnScore(0);
        setPhase('handoff');
      } else {
        bots.forEach((b) => {
          let s = 0;
          for (let i = 0; i < games.length; i++) {
            const skill = b.botSkill ?? 0.7;
            s += Math.round(clamp01(skill + (rng.float() - 0.5) * 0.3) * 100);
          }
          totals.current[b.id] = s;
        });
        const maxScore = games.length * 100;
        onComplete({
          scores: players.map((p) => ({ playerId: p.id, score: totals.current[p.id] })),
          correctAnswers: Math.round((yourBest.current / maxScore) * games.length),
          perfect: yourBest.current === maxScore,
          rounds: games.length,
        });
      }
    }
  };

  if (phase === 'handoff') {
    return (
      <View style={{ flex: 1 }}>
        <GameTopBar title={session.mode.title} onQuit={onQuit} />
        <PlayerHandoff player={currentHuman} hint={`${games.length} Minispiele warten auf dich!`} onReady={() => { setGameIndex(0); setTurnScore(0); setPhase('intro'); }} />
      </View>
    );
  }

  const Game = game.Component;
  return (
    <View style={{ flex: 1 }}>
      <GameTopBar
        title={game.name}
        subtitle={`${currentHuman.name} · Spiel ${gameIndex + 1}/${games.length}`}
        onQuit={onQuit}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="star" size={16} color="coin" />
            <AppText variant="bodyStrong" color="coin">
              {turnScore}
            </AppText>
          </View>
        }
      />
      {phase === 'intro' ? (
        <Animated.View key={`${humanIndex}-${gameIndex}`} entering={ZoomIn.springify().damping(13)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl }}>
          <View style={{ width: 120, height: 120, borderRadius: radii.xxl, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ fontSize: 64 }}>{game.emoji}</AppText>
          </View>
          <AppText variant="title" color="text">
            {game.name}
          </AppText>
          <AppText variant="body" color="textMuted" align="center">
            {game.instruction}
          </AppText>
        </Animated.View>
      ) : (
        <Game key={`${humanIndex}-${gameIndex}`} rng={rng} difficulty={config.difficulty} onResult={onResult} />
      )}
    </View>
  );
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
