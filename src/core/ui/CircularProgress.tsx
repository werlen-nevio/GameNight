import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { palette } from '../design/tokens';
import { clamp } from '../utils/format';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CircularProgressProps {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  fromColor?: string;
  toColor?: string;
  /** Linear-tween duration for changes, ms. 0 = snap. */
  duration?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * An SVG ring whose fill animates smoothly — used for countdown timers (ring
 * depletes with time) and level/XP rings. A two-stop gradient stroke keeps it
 * on-brand.
 */
export function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 12,
  trackColor = 'rgba(255,255,255,0.12)',
  fromColor = palette.cyan,
  toColor = palette.violetBright,
  duration = 400,
  children,
  style,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = useSharedValue(clamp(progress, 0, 1));

  useEffect(() => {
    const target = clamp(progress, 0, 1);
    value.value =
      duration > 0 ? withTiming(target, { duration, easing: Easing.out(Easing.cubic) }) : target;
  }, [progress, duration, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }));

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id="cpGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={fromColor} />
            <Stop offset="1" stopColor={toColor} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#cpGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      {children != null && (
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      )}
    </View>
  );
}
