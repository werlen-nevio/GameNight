import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radii } from '../design/tokens';

export interface ShimmerProps {
  width: number;
  height: number;
  radius?: number;
  /** Tint of the moving highlight. */
  color?: string;
  style?: ViewStyle;
}

/**
 * A looping diagonal light sweep — used as a premium sheen on featured cards,
 * "NEU" badges and locked/loading surfaces.
 */
export function Shimmer({ width, height, radius = radii.lg, color = 'rgba(255,255,255,0.18)', style }: ShimmerProps) {
  const x = useSharedValue(-1);

  useEffect(() => {
    x.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [x]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * width }, { rotate: '18deg' }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[{ width, height, borderRadius: radius, overflow: 'hidden' }, StyleSheet.absoluteFill, style]}
    >
      <Animated.View style={[{ width: width * 0.6, height: height * 2, top: -height / 2 }, sweepStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', color, 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
