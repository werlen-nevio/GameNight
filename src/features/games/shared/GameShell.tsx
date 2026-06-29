import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { AccentProvider } from '../../../core/design/ThemeProvider';
import { Screen } from '../../../core/ui';
import { Feedback } from '../../../core/services';
import { t } from '../../../core/i18n';
import {
  AVATAR_BY_ID,
  rankOutcome,
  type GameOutcome,
  type GameSession,
} from '../../../domain';
import { useLobbyStore, usePlayerStore, type MatchSummary } from '../../../state';
import { CountdownIntro } from './CountdownIntro';
import { Lobby } from './Lobby';
import { ResultsScreen } from './ResultsScreen';
import { RulesScreen } from './RulesScreen';
import type { GameModule } from './types';

type Phase = 'lobby' | 'rules' | 'countdown' | 'playing' | 'results';

/**
 * Orchestrates a full match for any {@link GameModule}: lobby → rules →
 * countdown → gameplay → results, owning the session, applying rewards on
 * completion and handling quit/replay. The shell is mode-agnostic.
 */
export function GameShell({
  module,
  onExit,
  daily,
}: {
  module: GameModule;
  onExit: () => void;
  /** When true, completing the match flags today's daily challenge as done. */
  daily?: { seed: string; onComplete: () => void };
}) {
  const { meta } = module;
  const player = usePlayerStore((s) => s.player);
  const recordMatch = usePlayerStore((s) => s.recordMatch);
  const lobby = useLobbyStore();

  const [phase, setPhase] = useState<Phase>(daily ? 'rules' : 'lobby');
  const [session, setSession] = useState<GameSession | null>(null);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [options, setOptions] = useState<Record<string, unknown>>(module.defaultOptions ?? {});

  const youAvatar = AVATAR_BY_ID[player.equipped.avatar]?.emoji ?? '🙂';

  // Initialize the lobby once for this mode.
  useEffect(() => {
    lobby.init({
      youName: player.name,
      youAvatarId: player.equipped.avatar,
      defaultDifficulty: meta.difficulties?.[1] ?? meta.difficulties?.[0] ?? 'medium',
    });
    // Daily mode skips the lobby and runs solo immediately.
    if (daily) {
      const resolved = module.buildConfig({
        difficulty: meta.difficulties?.[1] ?? 'medium',
        options: module.defaultOptions ?? {},
      });
      setSession(buildSession(resolved, daily.seed));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildSession(
    resolved: ReturnType<GameModule['buildConfig']>,
    seed?: string,
  ): GameSession {
    return useLobbyStore.getState().buildSession(meta, {
      rounds: resolved.rounds,
      timeLimit: resolved.timeLimit,
      options: resolved.options,
      seed,
    });
  }

  const setOption = (key: string, value: unknown) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const startMatch = () => {
    const seats = useLobbyStore.getState().seats;
    const hasHuman = seats.some((s) => !s.isYou && !s.isBot);
    useLobbyStore.getState().setPlayMode(hasHuman ? 'local' : 'solo');
    const resolved = module.buildConfig({ difficulty: lobby.difficulty, options });
    setSession(buildSession(resolved));
    setPhase('rules');
  };

  const handleComplete = (result: GameOutcome) => {
    if (!session) return;
    const ranking = rankOutcome(session, result);
    const matchSummary = recordMatch({
      modeId: meta.id,
      won: ranking.youWon,
      correctAnswers: result.correctAnswers,
      perfect: result.perfect,
      isDaily: !!daily,
    });
    setOutcome(result);
    setSummary(matchSummary);
    setPhase('results');
    daily?.onComplete();
  };

  const playAgain = () => {
    const resolved = module.buildConfig({ difficulty: lobby.difficulty, options });
    setSession(buildSession(resolved, daily?.seed));
    setOutcome(null);
    setSummary(null);
    Feedback.whoosh();
    setPhase('countdown');
  };

  const confirmQuit = () => {
    Alert.alert(t.game.quit, t.game.quitConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.game.quit, style: 'destructive', onPress: onExit },
    ]);
  };

  const Gameplay = module.Gameplay;

  const content = useMemo(() => {
    switch (phase) {
      case 'lobby':
        return (
          <Lobby
            module={module}
            options={options}
            setOption={setOption}
            onStart={startMatch}
            onClose={onExit}
          />
        );
      case 'rules':
        return <RulesScreen module={module} onContinue={() => setPhase('countdown')} />;
      case 'countdown':
        return <CountdownIntro onDone={() => setPhase('playing')} />;
      case 'playing':
        return session ? (
          <Gameplay session={session} onComplete={handleComplete} onQuit={confirmQuit} />
        ) : null;
      case 'results':
        return session && outcome && summary ? (
          <ResultsScreen
            session={session}
            outcome={outcome}
            summary={summary}
            onPlayAgain={daily ? onExit : playAgain}
            onLeave={onExit}
          />
        ) : null;
      default:
        return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, session, outcome, summary, options]);

  return (
    <AccentProvider accent={meta.accent}>
      <Screen
        gradient={meta.accent.canvasGradient}
        edges={phase === 'playing' || phase === 'countdown' ? ['top', 'bottom'] : ['top', 'bottom']}
        decorative={phase !== 'playing'}
      >
        {content}
      </Screen>
    </AccentProvider>
  );
}
