import { View } from 'react-native';

import { gradients } from '../../core/design/gradients';
import { AppText, GradientText } from '../../core/ui';

/** The GameNight wordmark — gradient-filled, with a glowing accent dot. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <AppText variant="hero" color="text" style={{ fontSize: size }}>
        GAME
      </AppText>
      <GradientText variant="hero" gradient={gradients.brandSheen} style={{ fontSize: size }}>
        NIGHT
      </GradientText>
    </View>
  );
}
