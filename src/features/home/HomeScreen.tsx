import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { spacing } from '../../core/design/tokens';
import { AppText, Screen, SectionHeader } from '../../core/ui';
import { t } from '../../core/i18n';
import { HomeHeader } from './HomeHeader';
import { LogoMark } from './LogoMark';
import { PlayHero } from './PlayHero';
import { OnlineCard } from './OnlineCard';
import { DailyCard } from './DailyCard';
import { ModeGrid } from './ModeGrid';
import { QuickLinks } from './QuickLinks';

/** The app's home: identity, progression, quick play, daily, modes and links. */
export function HomeScreen() {
  return (
    <Screen edges={['top']} maxContentWidth={820}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.colossal, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />

        <Animated.View entering={FadeInDown.springify().damping(16)} style={{ alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }}>
          <LogoMark size={40} />
          <AppText variant="caption" color="textFaint" uppercase>
            Die ultimative Party-Show
          </AppText>
        </Animated.View>

        <PlayHero />
        <OnlineCard />
        <DailyCard />

        <View>
          <SectionHeader title={t.home.modes} subtitle="Wähle deinen Modus" />
          <ModeGrid />
        </View>

        <QuickLinks />
      </ScrollView>
    </Screen>
  );
}
