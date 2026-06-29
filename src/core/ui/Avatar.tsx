import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { GradientStops } from '../design/gradients';
import { useTheme } from '../design/ThemeProvider';
import { AppText } from './Text';

export interface AvatarProps {
  /** An emoji or 1–2 letter initials shown inside the avatar. */
  emoji?: string;
  name?: string;
  size?: number;
  /** Optional gradient ring (a "frame" cosmetic). */
  frame?: GradientStops;
  /** Background gradient of the avatar disc. */
  background?: GradientStops;
  style?: ViewStyle;
}

/** Circular avatar with an optional decorative gradient frame. */
export function Avatar({ emoji, name, size = 56, frame, background, style }: AvatarProps) {
  const theme = useTheme();
  const ring = Math.max(2, Math.round(size * 0.06));
  const inner = size - ring * 2;
  const label = emoji ?? initials(name);

  const disc = (
    <LinearGradient
      colors={background ?? [theme.colors.surfaceElevated, theme.colors.surfaceAlt]}
      style={{
        width: frame ? inner : size,
        height: frame ? inner : size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText style={{ fontSize: (frame ? inner : size) * 0.5, lineHeight: (frame ? inner : size) * 0.62 }}>
        {label}
      </AppText>
    </LinearGradient>
  );

  if (!frame) return <View style={style}>{disc}</View>;

  return (
    <LinearGradient
      colors={frame}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          padding: ring,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {disc}
    </LinearGradient>
  );
}

function initials(name?: string): string {
  if (!name) return '🙂';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + second).toUpperCase() || '🙂';
}
