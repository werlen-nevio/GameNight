import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { AccentProvider } from '../../core/design/ThemeProvider';
import { spacing } from '../../core/design/tokens';
import { AppText, Avatar, Card, GameButton, Icon, Screen } from '../../core/ui';
import { Feedback } from '../../core/services';
import {
  PLAYER_COLORS,
  type GameOutcome,
  type GamePlayer,
  type GameSession,
} from '../../domain';
import { CountdownIntro } from '../games/shared/CountdownIntro';
import { ResultsScreen } from '../games/shared/ResultsScreen';
import { sanitizeReport } from '../games/shared/antiCheat';
import { getModule } from '../games/registry';
import { usePlayerStore, type MatchSummary } from '../../state';
import { useOnlineStore } from '../../state/onlineStore';

type Phase = 'countdown' | 'playing' | 'waiting' | 'results';

interface FinishedReport {
  persistentId: string;
  score: number;
  correctAnswers: number;
  perfect: boolean;
}

interface ResultRow {
  persistentId: string;
  name: string;
  emoji: string;
  color: string;
  score: number;
}

/**
 * Runs an online match by reusing the *existing* game modes unchanged: every
 * client plays the same seeded content solo, reports its score as a
 * `PlayerFinished` event, and the host aggregates an authoritative ranking
 * (`MatchResults`). The shared, beautiful {@link ResultsScreen} then renders the
 * synchronized podium for everyone.
 */
export function OnlineGameScreen() {
  const router = useRouter();
  const sync = useOnlineStore((s) => s.sync);
  const controller = useOnlineStore((s) => s.controller);
  const lobby = useOnlineStore((s) => s.lobby);
  const startPayload = useOnlineStore((s) => s.startPayload);
  const returnToLobby = useOnlineStore((s) => s.returnToLobby);
  const recordMatch = usePlayerStore((s) => s.recordMatch);

  const module = startPayload ? getModule(startPayload.modeId) : undefined;
  const me = lobby?.members.find((m) => m.isYou);

  const [phase, setPhase] = useState<Phase>('countdown');
  const [finished, setFinished] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const myReport = useRef<FinishedReport | null>(null);
  const reports = useRef<Map<string, FinishedReport>>(new Map());
  const expected = useRef<string[]>([]);

  // Snapshot of who is expected to finish (connected at kickoff).
  useEffect(() => {
    if (lobby) expected.current = lobby.members.filter((m) => m.connected).map((m) => m.persistentId);
    if (startPayload) sync?.beginMatch(startPayload.seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The local solo session: same seed → identical content on every device.
  const session = useMemo<GameSession | null>(() => {
    if (!module || !me || !startPayload) return null;
    const you: GamePlayer = {
      id: me.persistentId,
      name: me.name,
      emoji: me.avatarEmoji,
      color: me.color,
      isBot: false,
      isYou: true,
    };
    const cfg = (startPayload.config ?? {}) as { rounds?: number; timeLimit?: number; options?: Record<string, unknown> };
    return {
      mode: module.meta,
      players: [you],
      seed: startPayload.seed,
      config: {
        playMode: 'online',
        difficulty: 'medium',
        rounds: cfg.rounds ?? 5,
        timeLimit: cfg.timeLimit ?? 60,
        options: cfg.options,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, me?.persistentId]);

  // Listen for everyone's reports + the authoritative results.
  useEffect(() => {
    if (!sync) return;
    return sync.on((event) => {
      if (event.type === 'PlayerFinished') {
        const r = event.data as FinishedReport;
        // Anti-cheat: the host never trusts a client's reported score.
        let stored = r;
        if (sync.isHost && module && startPayload) {
          const cfg = (startPayload.config ?? {}) as { rounds?: number };
          const rounds = cfg.rounds ?? 5;
          const cap = module.scoreCap ? module.scoreCap({ rounds, timeLimit: 0, options: (startPayload.config as any)?.options }) : rounds * 1000;
          const s = sanitizeReport({ score: r.score, correctAnswers: r.correctAnswers, perfect: r.perfect, rounds }, { scoreCap: cap, rounds });
          stored = { ...r, score: s.score, correctAnswers: s.correctAnswers, perfect: s.perfect };
        }
        reports.current.set(r.persistentId, stored);
        setFinished(new Set(reports.current.keys()));
        // Host finalizes once everyone expected has reported.
        if (sync.isHost && expected.current.every((id) => reports.current.has(id))) {
          finalize();
        }
      } else if (event.type === 'MatchResults') {
        applyResults((event.data as { results: ResultRow[] }).results);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync]);

  // Host safety net: finalize after a timeout even if someone never reports.
  useEffect(() => {
    if (!sync?.isHost || phase !== 'waiting') return;
    const id = setTimeout(() => finalize(), 45_000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function finalize() {
    if (!sync?.isHost || !controller) return;
    const members = controller.snapshot().members;
    const rows: ResultRow[] = members.map((m, i) => ({
      persistentId: m.persistentId,
      name: m.name,
      emoji: m.avatarEmoji,
      color: m.color || PLAYER_COLORS[i % PLAYER_COLORS.length],
      score: reports.current.get(m.persistentId)?.score ?? 0,
    }));
    rows.sort((a, b) => b.score - a.score);
    sync.emit('MatchResults', { results: rows });
  }

  function applyResults(rows: ResultRow[]) {
    if (summary) return; // already applied
    const myRow = rows.find((r) => r.persistentId === me?.persistentId);
    const won = rows.length > 0 && rows[0].persistentId === me?.persistentId && rows[0].score > 0;
    const mine = myReport.current;
    const s = recordMatch({
      modeId: startPayload!.modeId,
      won,
      correctAnswers: mine?.correctAnswers ?? 0,
      perfect: mine?.perfect ?? false,
    });
    setResults(rows);
    setSummary(s);
    setPhase('results');
  }

  function onLocalComplete(outcome: GameOutcome) {
    const score = outcome.scores.find((sc) => sc.playerId === me?.persistentId)?.score ?? 0;
    const report: FinishedReport = {
      persistentId: me!.persistentId,
      score,
      correctAnswers: outcome.correctAnswers ?? 0,
      perfect: outcome.perfect ?? false,
    };
    myReport.current = report;
    reports.current.set(report.persistentId, report);
    setFinished(new Set(reports.current.keys()));
    sync?.emit('PlayerFinished', report);
    setPhase('waiting');
    if (sync?.isHost && expected.current.every((id) => reports.current.has(id))) finalize();
  }

  const exitHome = () => {
    useOnlineStore.getState().leave();
    router.replace('/');
  };
  const backToLobby = () => {
    returnToLobby();
    router.back();
  };

  if (!module || !session || !startPayload) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
          <AppText variant="subheading" color="textMuted">
            Spiel wird vorbereitet…
          </AppText>
          <GameButton label="Zur Lobby" fullWidth={false} onPress={backToLobby} />
        </View>
      </Screen>
    );
  }

  const Gameplay = module.Gameplay;

  // Build a synthetic session + outcome so the shared ResultsScreen renders all players.
  const resultsSession: GameSession | null =
    phase === 'results'
      ? {
          mode: module.meta,
          seed: startPayload.seed,
          config: session.config,
          players: results.map((r) => ({
            id: r.persistentId,
            name: r.name,
            emoji: r.emoji,
            color: r.color,
            isBot: false,
            isYou: r.persistentId === me?.persistentId,
          })),
        }
      : null;
  const resultsOutcome: GameOutcome | null =
    phase === 'results'
      ? { scores: results.map((r) => ({ playerId: r.persistentId, score: r.score })) }
      : null;

  return (
    <AccentProvider accent={module.meta.accent}>
      <Screen gradient={module.meta.accent.canvasGradient} decorative={phase !== 'playing'}>
        {phase === 'countdown' && <CountdownIntro onDone={() => setPhase('playing')} />}

        {phase === 'playing' && (
          <Gameplay session={session} onComplete={onLocalComplete} onQuit={exitHome} />
        )}

        {phase === 'waiting' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
            <Icon name="hourglass" size={44} color="primaryBright" />
            <AppText variant="title" color="text" align="center">
              Warte auf andere Spieler
            </AppText>
            <AppText variant="caption" color="textFaint">
              {finished.size}/{expected.current.length} fertig
            </AppText>
            <Card style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
              {(controller?.snapshot().members ?? []).map((m) => (
                <View key={m.persistentId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Avatar emoji={m.avatarEmoji} size={28} />
                  <AppText variant="body" color="text" style={{ flex: 1 }} numberOfLines={1}>
                    {m.isYou ? 'Du' : m.name}
                  </AppText>
                  {finished.has(m.persistentId) ? (
                    <Icon name="checkmark-circle" size={20} color="success" />
                  ) : (
                    <Icon name="ellipsis-horizontal" size={20} color="textFaint" />
                  )}
                </View>
              ))}
            </Card>
          </View>
        )}

        {phase === 'results' && resultsSession && resultsOutcome && summary && (
          <ResultsScreen
            session={resultsSession}
            outcome={resultsOutcome}
            summary={summary}
            onPlayAgain={backToLobby}
            onLeave={exitHome}
          />
        )}
      </Screen>
    </AccentProvider>
  );
}
