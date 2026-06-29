import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { GradientStops } from '../design/gradients';
import { motion, radii } from '../design/tokens';
import { useTheme } from '../design/ThemeProvider';
import { clamp } from '../utils/format';

export interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  height?: number;
  gradient?: GradientStops;
  trackColor?: string;
  /** Animate fill changes (default true). */
  animated?: boolean;
  style?: ViewStyle;
}

/** A rounded, gradient-filled progress bar that springs to new values. */
export function ProgressBar({
  progress,
  height = 12,
  gradient,
  trackColor,
  animated = true,
  style,
}: ProgressBarProps) {
  const theme = useTheme();
  const value = useSharedValue(clamp(progress, 0, 1));

  useEffect(() => {
    const target = clamp(progress, 0, 1);
    value.value = animated ? withSpring(target, motion.spring.gentle) : target;
  }, [progress, animated, value]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${value.value * 100}%`,
  }));

  return (
    <View
      style={[
        {
          height,
          borderRadius: radii.pill,
          backgroundColor: trackColor ?? 'rgba(0,0,0,0.35)',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[{ height: '100%' }, fillStyle]}>
        <LinearGradient
          colors={gradient ?? theme.gradients.xp}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: radii.pill }}
        />
      </Animated.View>
    </View>
  );
}
