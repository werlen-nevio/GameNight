import { View, type ViewStyle } from 'react-native';

import { useTheme } from '../design/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { AppText } from './Text';
import { PressableScale } from './PressableScale';

export interface IconButtonProps {
  name: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  /** Show a small numeric badge (e.g. unread notifications). */
  badge?: number;
  /** Visual container style: subtle disc, or none. */
  surface?: boolean;
  style?: ViewStyle;
}

/** A circular, tappable icon — header actions, close buttons, nav. */
export function IconButton({
  name,
  onPress,
  size = 44,
  color,
  badge,
  surface = true,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  return (
    <PressableScale feedback="tap" onPress={onPress} scaleTo={0.88} style={style}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: surface ? 'rgba(0,0,0,0.28)' : 'transparent',
          borderWidth: surface ? 1 : 0,
          borderColor: theme.colors.border,
        }}
      >
        <Icon name={name} size={size * 0.5} color={color ?? theme.colors.text} />
        {badge != null && badge > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 9,
              backgroundColor: theme.colors.danger,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: theme.colors.bg,
            }}
          >
            <AppText variant="label" color="onColor" style={{ fontSize: 9 }}>
              {badge > 99 ? '99+' : badge}
            </AppText>
          </View>
        )}
      </View>
    </PressableScale>
  );
}
