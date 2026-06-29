import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { appFonts } from '../core/design/fonts';
import { darkTheme, palette, withAccent } from '../core/design';
import { ThemeProvider } from '../core/design/ThemeProvider';
import { Audio } from '../core/services';
import { THEME_BY_ID } from '../domain';
import { usePlayerStore, useSettingsStore } from '../state';
import { useAccountStore } from '../state/accountStore';
import { ToastHost } from '../features/shared/ToastHost';
import { OnlineNotifications } from '../features/online/OnlineNotifications';
import { ReconnectOverlay } from '../features/online/ReconnectOverlay';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const playerHydrated = usePlayerStore((s) => s.hydrated);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const equippedTheme = usePlayerStore((s) => s.player.equipped.theme);

  // Initialize the audio session once.
  useEffect(() => {
    void Audio.init();
  }, []);

  // Sign in (guest) + connect account services + cloud sync, once hydrated.
  useEffect(() => {
    if (playerHydrated && settingsHydrated) void useAccountStore.getState().init();
  }, [playerHydrated, settingsHydrated]);

  const ready = (fontsLoaded || !!fontError) && playerHydrated && settingsHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    // Keep the native splash visible; render a matching solid backdrop.
    return <View style={{ flex: 1, backgroundColor: palette.night1 }} />;
  }

  const theme = withAccent(darkTheme, THEME_BY_ID[equippedTheme]?.accent);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider theme={theme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.night1 },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="game/[id]" options={{ animation: 'fade' }} />
            <Stack.Screen name="daily" options={{ animation: 'fade' }} />
            <Stack.Screen name="online" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="online-game" options={{ animation: 'fade' }} />
            <Stack.Screen name="shop" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="friends" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="achievements" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack>
          <OnlineNotifications />
          <ReconnectOverlay />
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
