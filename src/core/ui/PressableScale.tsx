import { type ReactNode } from 'react';
import { Pressable, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '../design/tokens';
import { Feedback } from '../services/feedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far the element scales while pressed. */
  scaleTo?: number;
  /** Slight dim while pressed, on top of the scale. */
  dimTo?: number;
  /** Haptic + sound played on press-in. Pass `null` to stay silent. */
  feedback?: keyof typeof Feedback | null;
  disabled?: boolean;
}

/**
 * The tactile heart of every interactive surface: a spring scale-down on press,
 * a spring-back on release, optional dim, and synchronized haptic + sound.
 * Used directly for cards/tiles and as the base for {@link GameButton}.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.94,
  dimTo = 1,
  feedback = 'tap',
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, motion.spring.stiff);
        if (dimTo !== 1) opacity.value = withTiming(dimTo, { duration: motion.fast });
        if (feedback) Feedback[feedback]();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, motion.spring.bouncy);
        if (dimTo !== 1) opacity.value = withTiming(1, { duration: motion.base });
        onPressOut?.(e);
      }}
      style={[{ opacity: disabled ? 0.5 : 1 }, animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
