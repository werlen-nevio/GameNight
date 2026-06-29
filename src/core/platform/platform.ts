import { Dimensions, Platform } from 'react-native';

import type { RuntimePlatform } from '../transport/types';

/** Coarse pointer type: touchscreen vs mouse/trackpad. */
export type InputMode = 'touch' | 'pointer';

function shortestSide(): number {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height);
}

/** Heuristic tablet detection (large shortest side on a mobile OS). */
export function isTablet(): boolean {
  return (Platform.OS === 'ios' || Platform.OS === 'android') && shortestSide() >= 600;
}

/** True when running in a desktop browser (wide viewport + fine pointer). */
function isDesktopWeb(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const fine = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
  return fine && window.innerWidth >= 900;
}

/** The runtime platform reported to other peers (drives the lobby icon). */
export function runtimePlatform(): RuntimePlatform {
  if (Platform.OS === 'web') return isDesktopWeb() ? 'desktop' : 'web';
  if (isTablet()) return 'tablet';
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/** Whether the primary input is a pointer (enables hover/keyboard affordances). */
export function inputMode(): InputMode {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'touch';
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches
    ? 'pointer'
    : 'touch';
}

export const isWeb = Platform.OS === 'web';
export const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/** Icon name (Ionicons) for a platform, used in the lobby player list. */
export function platformIcon(platform: RuntimePlatform): string {
  switch (platform) {
    case 'ios':
      return 'phone-portrait';
    case 'android':
      return 'logo-android';
    case 'tablet':
      return 'tablet-portrait';
    case 'desktop':
      return 'desktop';
    case 'web':
      return 'globe';
  }
}
