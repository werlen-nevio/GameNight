import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '../../../core/ui';
import { zLayers } from '../../../core/design/tokens';

export interface FloatingEmote {
  key: string;
  emoji: string;
  name: string;
  x: number; // 0..1
}

/** Transient emoji reactions that float up and fade — the lobby's life signal. */
export function FloatingEmotes({ items, onExpire }: { items: FloatingEmote[]; onExpire: (key: string) => void }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: zLayers.toast }]}>
      {items.map((it) => (
        <Floating key={it.key} item={it} onExpire={() => onExpire(it.key)} />
      ))}
    </View>
  );
}

function Floating({ item, onExpire }: { item: FloatingEmote; onExpire: () => void }) {
  const { width, height } = useWindowDimensions();
  const t = useSharedValue(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    t.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) });
    const id = setTimeout(() => {
      setDone(true);
      onExpire();
    }, 2300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -t.value * height * 0.4 }, { scale: 1 + t.value * 0.3 }],
    opacity: 1 - t.value,
  }));

  if (done) return null;
  return (
    <Animated.View style={[{ position: 'absolute', left: item.x * (width - 60), top: height * 0.62, alignItems: 'center' }, style]}>
      <AppText style={{ fontSize: 48 }}>{item.emoji}</AppText>
      <AppText variant="label" color="textFaint">
        {item.name}
      </AppText>
    </Animated.View>
  );
}
