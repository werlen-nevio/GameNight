import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { palette, zLayers } from '../design/tokens';
import { Rng } from '../utils/random';

const DEFAULT_COLORS = [
  palette.violetBright,
  palette.magenta,
  palette.cyan,
  palette.gold,
  palette.green,
  palette.orange,
  palette.blue,
];

interface PieceSpec {
  color: string;
  size: number;
  round: boolean;
  vx: number;
  vy: number;
  startX: number;
  startY: number;
  drift: number;
  spin: number;
  phase: number;
}

export interface ConfettiProps {
  /** 'burst' explodes from a point; 'rain' falls from the top. */
  mode?: 'burst' | 'rain';
  count?: number;
  duration?: number;
  colors?: readonly string[];
  /** Burst origin as a fraction of screen (0..1). Default center-top. */
  originX?: number;
  originY?: number;
  onDone?: () => void;
}

/**
 * A GPU-friendly confetti system: one shared timing value drives every piece via
 * projectile math in a worklet, so dozens of pieces animate at 60fps without a
 * JS-thread loop. Mount with a `key` to replay.
 */
export function Confetti({
  mode = 'burst',
  count = 70,
  duration = 2200,
  colors = DEFAULT_COLORS,
  originX = 0.5,
  originY = 0.42,
  onDone,
}: ConfettiProps) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  const pieces = useMemo<PieceSpec[]>(() => {
    const rng = new Rng();
    return Array.from({ length: count }, () => {
      if (mode === 'rain') {
        return {
          color: colors[rng.int(0, colors.length - 1)],
          size: rng.int(7, 13),
          round: rng.chance(0.4),
          vx: 0,
          vy: 0,
          startX: rng.float() * width,
          startY: -rng.int(20, 160),
          drift: rng.int(-60, 60),
          spin: rng.int(3, 8) * (rng.chance(0.5) ? 1 : -1),
          phase: rng.float() * Math.PI * 2,
        };
      }
      const angle = rng.float() * Math.PI * 2;
      const speed = rng.int(180, 560);
      return {
        color: colors[rng.int(0, colors.length - 1)],
        size: rng.int(8, 15),
        round: rng.chance(0.4),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rng.int(120, 320),
        startX: originX * width,
        startY: originY * height,
        drift: 0,
        spin: rng.int(2, 6) * (rng.chance(0.5) ? 1 : -1),
        phase: rng.float() * Math.PI * 2,
      };
    });
  }, [count, mode, colors, width, height, originX, originY]);

  useEffect(() => {
    progress.value = withTiming(1, { duration, easing: Easing.linear }, (finished) => {
      if (finished && onDone) runOnJS(onDone)();
    });
  }, [duration, onDone, progress]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: zLayers.fx }]}>
      {pieces.map((p, i) => (
        <Piece key={i} spec={p} progress={progress} mode={mode} screenH={height} />
      ))}
    </View>
  );
}

function Piece({
  spec,
  progress,
  mode,
  screenH,
}: {
  spec: PieceSpec;
  progress: SharedValue<number>;
  mode: 'burst' | 'rain';
  screenH: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    let x: number;
    let y: number;
    if (mode === 'rain') {
      x = spec.startX + Math.sin(p * 6 + spec.phase) * spec.drift;
      y = spec.startY + p * (screenH + 200);
    } else {
      // projectile with gravity
      x = spec.startX + spec.vx * p;
      y = spec.startY + spec.vy * p + 900 * p * p;
    }
    const fade = mode === 'rain' ? 1 - Math.max(0, p - 0.85) / 0.15 : 1 - Math.max(0, p - 0.6) / 0.4;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${p * spec.spin * 360}deg` },
      ],
      opacity: Math.max(0, fade),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: spec.size,
          height: spec.round ? spec.size : spec.size * 0.6,
          borderRadius: spec.round ? spec.size : 2,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
}
