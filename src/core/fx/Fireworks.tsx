import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { palette, zLayers } from '../design/tokens';
import { Rng } from '../utils/random';

const COLORS = [palette.gold, palette.magenta, palette.cyan, palette.violetBright, palette.green];

export interface FireworksProps {
  /** Number of sequential bursts. */
  bursts?: number;
  /** Particles per burst. */
  particles?: number;
  /** Gap between bursts (ms). */
  stagger?: number;
}

/** Celebratory firework bursts at random points — pairs well with a win screen. */
export function Fireworks({ bursts = 5, particles = 18, stagger = 420 }: FireworksProps) {
  const { width, height } = useWindowDimensions();
  const specs = useMemo(() => {
    const rng = new Rng();
    return Array.from({ length: bursts }, (_, i) => ({
      x: rng.int(Math.round(width * 0.15), Math.round(width * 0.85)),
      y: rng.int(Math.round(height * 0.12), Math.round(height * 0.5)),
      color: COLORS[rng.int(0, COLORS.length - 1)],
      delay: i * stagger + rng.int(0, 160),
      radius: rng.int(90, 150),
    }));
  }, [bursts, width, height, stagger]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: zLayers.fx }]}>
      {specs.map((s, i) => (
        <Burst key={i} {...s} particles={particles} />
      ))}
    </View>
  );
}

function Burst({
  x,
  y,
  color,
  delay,
  radius,
  particles,
}: {
  x: number;
  y: number;
  color: string;
  delay: number;
  radius: number;
  particles: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [p, delay]);

  const angles = useMemo(
    () => Array.from({ length: particles }, (_, i) => (i / particles) * Math.PI * 2),
    [particles],
  );

  return (
    <View style={{ position: 'absolute', left: x, top: y }}>
      {angles.map((a, i) => (
        <Spark key={i} angle={a} color={color} radius={radius} progress={p} />
      ))}
    </View>
  );
}

function Spark({
  angle,
  color,
  radius,
  progress,
}: {
  angle: number;
  color: string;
  radius: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const dist = radius * t;
    return {
      transform: [
        { translateX: Math.cos(angle) * dist },
        { translateY: Math.sin(angle) * dist + 40 * t * t },
        { scale: 1 - t * 0.5 },
      ],
      opacity: t === 0 ? 0 : 1 - t,
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: 6,
        },
        style,
      ]}
    />
  );
}
