import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { radii, spacing } from '../../core/design/tokens';
import { useTheme } from '../../core/design/ThemeProvider';
import {
  AppText,
  Card,
  Divider,
  GameButton,
  Icon,
  ModalHeader,
  Screen,
} from '../../core/ui';
import { Feedback } from '../../core/services';
import { hasRelay } from '../../core/transport/config';
import { useOnlineStore } from '../../state/onlineStore';

const TRANSPORT_LABEL: Record<string, string> = {
  websocket: 'Relay-Server',
  broadcast: 'Browser-Tabs (lokal)',
  loopback: 'Lokales Netzwerk',
};

/** Create or join an online lobby. */
export function OnlineHub({ initialCode }: { initialCode?: string }) {
  const router = useRouter();
  const theme = useTheme();
  const host = useOnlineStore((s) => s.host);
  const join = useOnlineStore((s) => s.join);
  const status = useOnlineStore((s) => s.status);
  const transportKind = useOnlineStore((s) => s.transportKind);
  const [code, setCode] = useState(initialCode ?? '');
  const [busy, setBusy] = useState(false);
  const autoJoined = useRef(false);

  const doJoin = async (c: string) => {
    if (busy || c.length < 4) return;
    setBusy(true);
    try {
      await join(c);
    } catch {
      Feedback.error();
    } finally {
      setBusy(false);
    }
  };

  // Auto-join when arriving via an invite link.
  useEffect(() => {
    if (initialCode && !autoJoined.current) {
      autoJoined.current = true;
      void doJoin(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const doHost = async () => {
    if (busy) return;
    setBusy(true);
    Feedback.press();
    try {
      await host();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} maxContentWidth={620}>
      <ModalHeader title="Online spielen" onClose={() => router.back()} />
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.xl, justifyContent: 'center' }}>
        <Animated.View entering={FadeInDown.springify().damping(16)} style={{ alignItems: 'center', gap: spacing.xs }}>
          <AppText style={{ fontSize: 56 }}>🎮</AppText>
          <AppText variant="title" color="text" align="center">
            Spiele mit Freunden
          </AppText>
          <AppText variant="body" color="textMuted" align="center">
            Erstelle eine Lobby oder tritt mit einem Code bei – plattformübergreifend.
          </AppText>
        </Animated.View>

        <GameButton
          label="Lobby erstellen"
          size="lg"
          loading={busy && status === 'connecting'}
          leftIcon={<Icon name="add-circle" size={22} color="onPrimary" />}
          onPress={doHost}
        />

        <Divider label="oder" />

        <Card style={{ gap: spacing.md }}>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="CODE EINGEBEN"
            placeholderTextColor={theme.colors.textFaint}
            autoCapitalize="characters"
            style={{
              color: theme.colors.text,
              fontFamily: 'Baloo2_700Bold',
              fontSize: 26,
              letterSpacing: 8,
              textAlign: 'center',
              backgroundColor: 'rgba(0,0,0,0.25)',
              borderRadius: radii.md,
              paddingVertical: spacing.md,
            }}
          />
          <GameButton
            label="Lobby beitreten"
            variant="secondary"
            size="md"
            disabled={code.length < 4 || busy}
            leftIcon={<Icon name="enter" size={20} color="text" />}
            onPress={() => doJoin(code)}
          />
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
          <Icon name="git-network" size={13} color="textFaint" />
          <AppText variant="caption" color="textFaint">
            Verbindung: {TRANSPORT_LABEL[transportKind] ?? transportKind}
            {!hasRelay && transportKind !== 'broadcast' ? ' · Relay-URL für geräteübergreifend' : ''}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}
