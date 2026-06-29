import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { radii, spacing } from '../../../core/design/tokens';
import { useTheme } from '../../../core/design/ThemeProvider';
import { AppText, Card, GameButton, PressableScale } from '../../../core/ui';
import { Feedback } from '../../../core/services';
import { Rng } from '../../../core/utils/random';
import { clamp } from '../../../core/utils/format';
import type { Difficulty } from '../../../domain';

/** A minigame reports a normalized 0..1 score (1 = perfect) exactly once. */
export interface MiniGameProps {
  rng: Rng;
  difficulty: Difficulty;
  onResult: (norm: number) => void;
}

export interface MiniGameDef {
  id: string;
  name: string;
  emoji: string;
  instruction: string;
  Component: ComponentType<MiniGameProps>;
}

/** Calls `cb` once, ever — protects minigames from double-reporting. */
function useOnce(cb: (n: number) => void) {
  const done = useRef(false);
  return (n: number) => {
    if (done.current) return;
    done.current = true;
    cb(n);
  };
}

/* --------------------------------------------------------- Reaction time */

function ReactionTime({ onResult }: MiniGameProps) {
  const [state, setState] = useState<'wait' | 'go' | 'early'>('wait');
  const goAt = useRef(0);
  const finish = useOnce(onResult);

  useEffect(() => {
    const delay = 1400 + Math.random() * 2600;
    const id = setTimeout(() => {
      setState('go');
      goAt.current = Date.now();
      Feedback.go();
    }, delay);
    return () => clearTimeout(id);
  }, []);

  const tap = () => {
    if (state === 'wait') {
      setState('early');
      Feedback.error();
      setTimeout(() => finish(0), 700);
    } else if (state === 'go') {
      const rt = Date.now() - goAt.current;
      const norm = clamp(1 - (rt - 170) / 600, 0, 1);
      Feedback.success();
      finish(norm);
    }
  };

  const bg = state === 'go' ? '#15A85A' : state === 'early' ? '#D62b48' : '#1C1147';
  return (
    <Pressable onPress={tap} style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderRadius: radii.xl, margin: spacing.lg }}>
      <AppText variant="title" color="onColor" align="center" style={{ paddingHorizontal: spacing.xl }}>
        {state === 'wait' ? 'Warte auf GRÜN …' : state === 'go' ? 'JETZT TIPPEN!' : 'Zu früh! 😅'}
      </AppText>
    </Pressable>
  );
}

/* ------------------------------------------------------------- Quick math */

function QuickMath({ rng, difficulty, onResult }: MiniGameProps) {
  const total = 5;
  const range = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 50;
  const [problems] = useState(() =>
    Array.from({ length: total }, () => {
      const a = rng.int(2, range);
      const b = rng.int(2, range);
      const op = rng.pick(['+', '−', '×'] as const)!;
      const answer = op === '+' ? a + b : op === '−' ? a - b : a * b;
      const options = rng.shuffle([
        answer,
        answer + rng.int(1, 5),
        answer - rng.int(1, 5),
        answer + rng.int(6, 12),
      ]);
      return { text: `${a} ${op} ${b}`, answer, options };
    }),
  );
  const [idx, setIdx] = useState(0);
  const correct = useRef(0);
  const finish = useOnce(onResult);
  const p = problems[idx];

  const answer = (val: number) => {
    if (val === p.answer) {
      correct.current += 1;
      Feedback.select();
    } else {
      Feedback.error();
    }
    if (idx < total - 1) setIdx(idx + 1);
    else finish(correct.current / total);
  };

  return (
    <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.lg }}>
      <AppText variant="label" color="textFaint" uppercase align="center">
        Aufgabe {idx + 1}/{total}
      </AppText>
      <AppText variant="hero" color="text" align="center" style={{ fontSize: 56 }}>
        {p.text}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' }}>
        {p.options.map((o, i) => (
          <PressableScale key={i} feedback={null} onPress={() => answer(o)} style={{ width: '46%' }}>
            <Card padding="lg" style={{ alignItems: 'center' }}>
              <AppText variant="title" color="text">
                {o}
              </AppText>
            </Card>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/* --------------------------------------------------------- Memory number */

function MemoryNumber({ rng, difficulty, onResult }: MiniGameProps) {
  const len = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
  const [target] = useState(() => Array.from({ length: len }, () => rng.int(0, 9)).join(''));
  const [phase, setPhase] = useState<'show' | 'input'>('show');
  const [entry, setEntry] = useState('');
  const finish = useOnce(onResult);

  useEffect(() => {
    const id = setTimeout(() => setPhase('input'), 800 + len * 450);
    return () => clearTimeout(id);
  }, [len]);

  const press = (d: string) => {
    if (entry.length >= len) return;
    const next = entry + d;
    setEntry(next);
    Feedback.tap();
    if (next.length === len) {
      let match = 0;
      for (let i = 0; i < len; i++) if (next[i] === target[i]) match += 1;
      const norm = match === len ? 1 : match / len;
      if (norm === 1) Feedback.success();
      else Feedback.error();
      setTimeout(() => finish(norm), 500);
    }
  };

  if (phase === 'show') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
        <AppText variant="label" color="textFaint" uppercase>
          Merke dir die Zahl
        </AppText>
        <AppText variant="hero" color="primaryBright" style={{ fontSize: 64, letterSpacing: 8 }}>
          {target}
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.lg }}>
      <AppText variant="heading" color="text" align="center" style={{ letterSpacing: 8 }}>
        {entry.padEnd(len, '•')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
          <PressableScale key={d} feedback={null} onPress={() => press(d)}>
            <Card padding="md" style={{ width: 64, alignItems: 'center' }}>
              <AppText variant="title" color="text">
                {d}
              </AppText>
            </Card>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------- Estimate dots */

function EstimateDots({ rng, difficulty, onResult }: MiniGameProps) {
  const count = rng.int(difficulty === 'easy' ? 8 : 14, difficulty === 'easy' ? 22 : 40);
  const [dots] = useState(() =>
    Array.from({ length: count }, () => ({ x: rng.float(), y: rng.float() })),
  );
  const [phase, setPhase] = useState<'show' | 'guess'>('show');
  const finish = useOnce(onResult);
  const options = useState(() => rng.shuffle([count, count + rng.int(2, 6), count - rng.int(2, 6), count + rng.int(7, 12)]))[0];

  useEffect(() => {
    const id = setTimeout(() => setPhase('guess'), 1300);
    return () => clearTimeout(id);
  }, []);

  if (phase === 'show') {
    return (
      <View style={{ flex: 1, margin: spacing.lg }}>
        <View style={{ flex: 1, borderRadius: radii.xl, backgroundColor: '#1C1147', overflow: 'hidden' }}>
          {dots.map((d, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: `${6 + d.x * 88}%`,
                top: `${6 + d.y * 88}%`,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: '#FFD23F',
              }}
            />
          ))}
        </View>
      </View>
    );
  }

  const choose = (val: number) => {
    const diff = Math.abs(val - count);
    const norm = diff === 0 ? 1 : diff <= 2 ? 0.6 : diff <= 5 ? 0.3 : 0;
    if (norm >= 0.6) Feedback.success();
    else Feedback.error();
    finish(norm);
  };

  return (
    <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.lg }}>
      <AppText variant="heading" color="text" align="center">
        Wie viele Punkte waren das?
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' }}>
        {options.map((o, i) => (
          <PressableScale key={i} feedback={null} onPress={() => choose(o)} style={{ width: '46%' }}>
            <Card padding="lg" style={{ alignItems: 'center' }}>
              <AppText variant="title" color="text">
                {o}
              </AppText>
            </Card>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------- Tap speed */

function TapSpeed({ onResult }: MiniGameProps) {
  const DURATION = 5;
  const [taps, setTaps] = useState(0);
  const [remaining, setRemaining] = useState(DURATION);
  const [started, setStarted] = useState(false);
  const finish = useOnce(onResult);

  useEffect(() => {
    if (!started) return;
    const end = Date.now() + DURATION * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, (end - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        setTaps((t) => {
          finish(clamp(t / 45, 0, 1));
          return t;
        });
      }
    }, 100);
    return () => clearInterval(id);
  }, [started]);

  if (!started) {
    return (
      <View style={{ flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
        <AppText variant="title" color="text" align="center">
          Tippe so oft wie möglich in 5 Sekunden!
        </AppText>
        <GameButton label="Start" size="lg" fullWidth={false} onPress={() => setStarted(true)} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        setTaps((t) => t + 1);
        Feedback.tap();
      }}
      style={{ flex: 1, margin: spacing.lg, borderRadius: radii.xl, backgroundColor: '#6C2BD9', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}
    >
      <AppText variant="hero" color="onColor" style={{ fontSize: 80 }}>
        {taps}
      </AppText>
      <AppText variant="subheading" color="onColor" dim>
        {remaining.toFixed(1)}s
      </AppText>
    </Pressable>
  );
}

/* ----------------------------------------------------------- Color Stroop */

const COLORS: { name: string; hex: string }[] = [
  { name: 'ROT', hex: '#FF5470' },
  { name: 'BLAU', hex: '#3B82F6' },
  { name: 'GRÜN', hex: '#2BD576' },
  { name: 'GELB', hex: '#FFD23F' },
];

function ColorMatch({ rng, onResult }: MiniGameProps) {
  const total = 5;
  const [round, setRound] = useState(0);
  const correct = useRef(0);
  const finish = useOnce(onResult);
  const [puzzle, setPuzzle] = useState(() => makePuzzle(rng));

  function makePuzzle(r: Rng) {
    const word = r.pick(COLORS)!;
    let ink = r.pick(COLORS)!;
    while (ink.name === word.name) ink = r.pick(COLORS)!;
    return { word, ink, options: r.shuffle(COLORS) };
  }

  const choose = (name: string) => {
    if (name === puzzle.ink.name) {
      correct.current += 1;
      Feedback.select();
    } else {
      Feedback.error();
    }
    if (round < total - 1) {
      setRound(round + 1);
      setPuzzle(makePuzzle(rng));
    } else {
      finish(correct.current / total);
    }
  };

  return (
    <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.xl }}>
      <AppText variant="caption" color="textFaint" align="center">
        Tippe die FARBE des Wortes – nicht das Wort! ({round + 1}/{total})
      </AppText>
      <Animated.View key={round} entering={FadeIn}>
        <AppText variant="hero" align="center" style={{ color: puzzle.ink.hex, fontSize: 64 }}>
          {puzzle.word.name}
        </AppText>
      </Animated.View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' }}>
        {puzzle.options.map((c) => (
          <PressableScale key={c.name} feedback={null} onPress={() => choose(c.name)} style={{ width: '46%' }}>
            <View style={{ height: 56, borderRadius: radii.lg, backgroundColor: c.hex }} />
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------- Registry */

export const MINI_GAMES: MiniGameDef[] = [
  { id: 'reaction', name: 'Reaktion', emoji: '⚡', instruction: 'Tippe, sobald es grün wird!', Component: ReactionTime },
  { id: 'math', name: 'Kopfrechnen', emoji: '🧮', instruction: 'Löse die Rechenaufgaben!', Component: QuickMath },
  { id: 'memory', name: 'Merken', emoji: '🧠', instruction: 'Merke dir die Zahl!', Component: MemoryNumber },
  { id: 'estimate', name: 'Schätzen', emoji: '👀', instruction: 'Schätze die Anzahl!', Component: EstimateDots },
  { id: 'tap', name: 'Finger-Speed', emoji: '👆', instruction: 'Tippe so schnell du kannst!', Component: TapSpeed },
  { id: 'color', name: 'Farben', emoji: '🎨', instruction: 'Tippe die Farbe, nicht das Wort!', Component: ColorMatch },
];
