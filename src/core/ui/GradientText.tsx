import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { type TextStyle } from 'react-native';

import { textVariants, type TextVariant } from '../design/typography';
import type { GradientStops } from '../design/gradients';
import { useTheme } from '../design/ThemeProvider';
import { AppText } from './Text';

export interface GradientTextProps {
  children: string;
  variant?: TextVariant;
  gradient?: GradientStops;
  style?: TextStyle;
}

/**
 * Text filled with a gradient (via a mask). Reserved for hero moments — the
 * logo, big section titles, winner banners — where flat color isn't enough.
 */
export function GradientText({ children, variant = 'display', gradient, style }: GradientTextProps) {
  const theme = useTheme();
  const stops = gradient ?? theme.gradients.primary;
  return (
    <MaskedView
      maskElement={
        <AppText variant={variant} style={[{ backgroundColor: 'transparent' }, style]}>
          {children}
        </AppText>
      }
    >
      <LinearGradient colors={stops} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Transparent text reserves the exact layout the gradient fills. */}
        <AppText variant={variant} style={[style, { opacity: 0 }]}>
          {children}
        </AppText>
      </LinearGradient>
    </MaskedView>
  );
}
