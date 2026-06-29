import * as ExpoHaptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Centralized haptic feedback. Every tactile cue in the app routes through
 * here so a single settings toggle (`setHapticsEnabled`) governs all of it,
 * and unsupported platforms (web) silently no-op.
 */
let enabled = true;
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

function active(): boolean {
  return enabled && supported;
}

export const Haptics = {
  /** Light tap — selection changes, small button presses. */
  light(): void {
    if (active()) void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
  },
  /** Medium tap — primary button presses, confirmations. */
  medium(): void {
    if (active()) void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
  },
  /** Heavy thud — big moments, slams, lock-ins. */
  heavy(): void {
    if (active()) void ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy);
  },
  /** Rigid tick — used for countdown ticks and rapid toggles. */
  tick(): void {
    if (active()) void ExpoHaptics.selectionAsync();
  },
  success(): void {
    if (active()) void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
  },
  warning(): void {
    if (active()) void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
  },
  error(): void {
    if (active()) void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
  },
};
