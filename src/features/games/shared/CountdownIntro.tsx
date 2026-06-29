import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '../../../core/ui';
import { Feedback } from '../../../core/services';
import { useSettingsStore } from '../../../state';

/**
 * The cinematic "3 · 2 · 1 · LOS!" intro shown before every match. Each beat
 * punches in with a spring scale + fade and a synced haptic/sound, ending on a
 * bold "LOS!" before handing control to gameplay.
 */
export function CountdownIntro({ onDone }: { onDone: () => void }) {
  const reduced = useSettingsStore((s) => s.reducedMotion);
  const [label, setLabel] = useState('3');
  const scale = useSharedValue(0.2);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const beats = ['3', '2', '1', 'LOS!'];
    let i = 0;
    const punch = () => {
      setLabel(beats[i]);
      if (beats[i] === 'LOS!') Feedback.go();
      else Feedback.tick();
      scale.value = 0.4;
      opacity.value = 1;
      scale.value = withSequence(
        withTiming(1.12, { duration: 180, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 120 }),
      );
      if (i === beats.length - 1) {
        opacity.value = withTiming(0, { duration: 420 });
      }
    };

    punch();
    const interval = reduced ? 500 : 750;
    const id = setInterval(() => {
      i += 1;
      if (i >= beats.length) {
        clearInterval(id);
        setTimeout(onDone, reduced ? 120 : 320);
        return;
      }
      punch();
    }, interval);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
      <Animated.View style={style}>
        <AppText variant="hero" color="text" style={{ fontSize: label === 'LOS!' ? 84 : 140 }}>
          {label}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
