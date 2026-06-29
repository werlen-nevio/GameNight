import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '../design/tokens';
import { useTheme } from '../design/ThemeProvider';
import { Feedback } from '../services/feedback';

/** An animated on/off switch with spring knob travel and color crossfade. */
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  const t = useSharedValue(value ? 1 : 0);
  const W = 52;
  const H = 30;
  const knob = 24;

  useEffect(() => {
    t.value = withTiming(value ? 1 : 0, { duration: motion.base });
  }, [value, t]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], ['rgba(255,255,255,0.14)', theme.colors.primary]),
  }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(value ? W - knob - 3 : 3, motion.spring.snappy) }],
  }));

  return (
    <Pressable
      onPress={() => {
        Feedback.tap();
        onChange(!value);
      }}
      hitSlop={8}
    >
      <Animated.View style={[{ width: W, height: H, borderRadius: H / 2, justifyContent: 'center' }, trackStyle]}>
        <Animated.View
          style={[
            {
              width: knob,
              height: knob,
              borderRadius: knob / 2,
              backgroundColor: '#FFFFFF',
            },
            knobStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
