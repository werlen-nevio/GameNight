import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion, radii, spacing } from '../design/tokens';
import type { GradientStops } from '../design/gradients';
import { useTheme } from '../design/ThemeProvider';
import { AppText } from './Text';
import { Feedback } from '../services/feedback';

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'coin' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface GameButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const SIZES: Record<ButtonSize, { height: number; px: number; variant: 'button' | 'subheading' }> = {
  sm: { height: 46, px: spacing.lg, variant: 'button' },
  md: { height: 56, px: spacing.xxl, variant: 'button' },
  lg: { height: 66, px: spacing.xxxl, variant: 'subheading' },
};

const DEPTH = 5; // height of the solid 3D bottom edge

/**
 * The primary call-to-action. A two-layer "candy" button: a colored base edge
 * plus a gradient face that translates down onto the base when pressed, giving
 * a satisfying physical depress. Includes a glossy top shine.
 */
export function GameButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = true,
  disabled,
  loading,
  style,
}: GameButtonProps) {
  const theme = useTheme();
  const dims = SIZES[size];
  const press = useSharedValue(0);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * DEPTH }],
  }));

  const v = resolveVariant(variant, theme);
  const isFlat = variant === 'ghost';
  const inactive = disabled || loading;

  return (
    <Pressable
      disabled={inactive}
      onPressIn={() => {
        press.value = withTiming(1, { duration: motion.instant });
        if (!isFlat) Feedback.press();
        else Feedback.tap();
      }}
      onPressOut={() => {
        press.value = withSpring(0, motion.spring.bouncy);
      }}
      onPress={onPress}
      style={[
        { opacity: inactive ? 0.55 : 1, alignSelf: fullWidth ? 'stretch' : 'flex-start' },
        style,
      ]}
    >
      <View style={{ paddingBottom: isFlat ? 0 : DEPTH }}>
        {/* Base edge (the 3D bottom) */}
        {!isFlat && (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: v.base, borderRadius: radii.lg, top: DEPTH },
            ]}
          />
        )}

        {/* Face */}
        <Animated.View style={faceStyle}>
          <LinearGradient
            colors={v.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              height: dims.height,
              borderRadius: radii.lg,
              paddingHorizontal: dims.px,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              borderWidth: isFlat ? 2 : 0,
              borderColor: theme.colors.borderStrong,
              overflow: 'hidden',
            }}
          >
            {/* Glossy top shine */}
            {!isFlat && (
              <LinearGradient
                colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: dims.height * 0.5,
                }}
              />
            )}

            {loading ? (
              <ActivityIndicator color={v.text} />
            ) : (
              <>
                {leftIcon}
                <AppText variant={dims.variant} color={v.text} numberOfLines={1}>
                  {label}
                </AppText>
                {rightIcon}
              </>
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function resolveVariant(
  variant: ButtonVariant,
  theme: ReturnType<typeof useTheme>,
): { gradient: GradientStops; base: string; text: string } {
  switch (variant) {
    case 'success':
      return { gradient: theme.gradients.success, base: '#15A85A', text: theme.colors.onColor };
    case 'danger':
      return { gradient: theme.gradients.danger, base: '#D62b48', text: theme.colors.onColor };
    case 'coin':
      return { gradient: theme.gradients.coin, base: '#E0A21B', text: '#3A2A00' };
    case 'secondary':
      return {
        gradient: [theme.colors.surfaceElevated, theme.colors.surface],
        base: theme.colors.bg,
        text: theme.colors.text,
      };
    case 'ghost':
      return {
        gradient: ['transparent', 'transparent'],
        base: 'transparent',
        text: theme.colors.text,
      };
    case 'primary':
    default:
      return {
        gradient: theme.gradients.primary,
        base: theme.colors.primaryDeep,
        text: theme.colors.onPrimary,
      };
  }
}
