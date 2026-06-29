import { useRouter } from 'expo-router';

import { Screen, AppText, GameButton } from '../core/ui';
import { View } from 'react-native';
import { dateKey } from '../core/utils/format';
import { GameShell } from '../features/games/shared/GameShell';
import { dailyModeId, getModule } from '../features/games/registry';
import { useDailyStore } from '../state';

/** Runs today's Daily Challenge: a deterministic, seeded solo match. */
export default function DailyRoute() {
  const router = useRouter();
  const markCompleted = useDailyStore((s) => s.markCompleted);
  const today = dateKey();
  const module = getModule(dailyModeId(today));
  const exit = () => router.replace('/');

  if (!module) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
          <AppText variant="title" color="text">
            Keine Challenge verfügbar
          </AppText>
          <GameButton label="Zurück" fullWidth={false} onPress={exit} />
        </View>
      </Screen>
    );
  }

  return (
    <GameShell
      module={module}
      onExit={exit}
      daily={{ seed: `daily-${today}`, onComplete: () => markCompleted(today) }}
    />
  );
}
