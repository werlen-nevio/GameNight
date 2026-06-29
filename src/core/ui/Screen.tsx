import { type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import type { GradientStops } from '../design/gradients';
import { useTheme } from '../design/ThemeProvider';

export interface ScreenProps {
  children: ReactNode;
  /** Override the canvas gradient (e.g. tinted per game mode). */
  gradient?: GradientStops;
  /** Safe-area edges to inset. Defaults to top + bottom. */
  edges?: readonly Edge[];
  /** Soft ambient glow blobs behind content for depth. */
  decorative?: boolean;
  /** Center content within this width on large screens (tablet/desktop). */
  maxContentWidth?: number;
  style?: ViewStyle;
}

/**
 * The root container for every screen: a full-bleed gradient canvas, optional
 * ambient glow, and safe-area insets. Guarantees a consistent backdrop so
 * individual screens focus purely on content.
 */
export function Screen({
  children,
  gradient,
  edges = ['top', 'bottom'],
  decorative = true,
  maxContentWidth,
  style,
}: ScreenProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const constrain = maxContentWidth != null && width > maxContentWidth;
  const body = constrain ? (
    <View style={{ flex: 1, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' }}>{children}</View>
  ) : (
    children
  );
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradient ?? theme.gradients.canvas}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {decorative && (
        <>
          <GlowBlob color={theme.colors.primary} size={320} top={-90} left={-70} />
          <GlowBlob color={theme.colors.gem} size={260} top={120} right={-90} opacity={0.18} />
        </>
      )}
      <SafeAreaView edges={edges} style={[styles.safe, style]}>
        {body}
      </SafeAreaView>
    </View>
  );
}

function GlowBlob({
  color,
  size,
  top,
  left,
  right,
  opacity = 0.22,
}: {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  opacity?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left,
        right,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        // A large blur radius reads as a soft radial glow.
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius: size / 2,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
});
