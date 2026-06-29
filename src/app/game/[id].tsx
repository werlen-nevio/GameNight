import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Screen, AppText, GameButton } from '../../core/ui';
import { GameShell } from '../../features/games/shared/GameShell';
import { ComingSoon } from '../../features/games/shared/ComingSoon';
import { getModeMeta, getModule } from '../../features/games/registry';

/** Hosts a game by id: runs the full match, shows "coming soon", or 404s. */
export default function GameRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const exit = () => router.replace('/');

  const module = id ? getModule(id) : undefined;
  if (module) {
    return <GameShell module={module} onExit={exit} />;
  }

  const meta = id ? getModeMeta(id) : undefined;
  if (meta) {
    return <ComingSoon meta={meta} onBack={exit} />;
  }

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <AppText variant="title" color="text">
          Modus nicht gefunden
        </AppText>
        <GameButton label="Zurück" fullWidth={false} onPress={exit} />
      </View>
    </Screen>
  );
}
