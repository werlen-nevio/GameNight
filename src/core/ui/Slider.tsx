import { useRef } from 'react';
import { PanResponder, View, type ViewStyle } from 'react-native';

import { radii } from '../design/tokens';
import { useTheme } from '../design/ThemeProvider';
import { clamp } from '../utils/format';

/**
 * A minimal, dependency-free horizontal slider (PanResponder-based, works on
 * touch and pointer). Used for per-peer voice volume.
 */
export function Slider({
  value,
  onChange,
  color,
  height = 6,
  style,
}: {
  value: number;
  onChange: (v: number) => void;
  color?: string;
  height?: number;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const width = useRef(1);
  const accent = color ?? theme.colors.primary;

  const set = (x: number) => onChange(clamp(x / width.current, 0, 1));
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => set(e.nativeEvent.locationX),
      onPanResponderMove: (e) => set(e.nativeEvent.locationX),
    }),
  ).current;

  return (
    <View
      onLayout={(e) => (width.current = e.nativeEvent.layout.width || 1)}
      {...pan.panHandlers}
      style={[{ justifyContent: 'center', paddingVertical: 10 }, style]}
    >
      <View style={{ height, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.14)' }}>
        <View style={{ height, width: `${value * 100}%`, borderRadius: radii.pill, backgroundColor: accent }} />
      </View>
      <View
        style={{
          position: 'absolute',
          left: `${value * 100}%`,
          width: 16,
          height: 16,
          marginLeft: -8,
          borderRadius: 8,
          backgroundColor: '#FFFFFF',
        }}
      />
    </View>
  );
}
