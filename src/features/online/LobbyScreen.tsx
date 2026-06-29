import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import { radii, spacing } from '../../core/design/tokens';
import {
  AppText,
  Card,
  GameButton,
  Icon,
  IconButton,
  PressableScale,
  Screen,
  Tag,
} from '../../core/ui';
import { Confetti } from '../../core/fx';
import { Feedback } from '../../core/services';
import { createId } from '../../core/utils/id';
import { ALL_MODE_METAS, getModule } from '../games/registry';
import { useOnlineStore } from '../../state/onlineStore';
import { InvitePanel } from './components/InvitePanel';
import { MemberTile } from './components/MemberTile';
import { ChatPanel } from './components/ChatPanel';
import { EmoteBar } from './components/EmoteBar';
import { FloatingEmotes, type FloatingEmote } from './components/FloatingEmotes';
import { EMOTE_BY_ID } from '../../domain';

const READY_MODES = ALL_MODE_METAS.filter((m) => m.status === 'ready');

/** The online lobby — invite, ready up, chat, emote, and launch together. */
export function LobbyScreen() {
  const router = useRouter();
  const lobby = useOnlineStore((s) => s.lobby);
  const controller = useOnlineStore((s) => s.controller);
  const status = useOnlineStore((s) => s.status);
  const error = useOnlineStore((s) => s.error);
  const leave = useOnlineStore((s) => s.leave);

  const [selectedMode, setSelectedMode] = useState(READY_MODES[0]?.id);
  const [emotes, setEmotes] = useState<FloatingEmote[]>([]);
  const [burst, setBurst] = useState(0);
  const navigatedRef = useRef(false);

  // Floating emote reactions.
  useEffect(() => {
    if (!controller) return;
    return controller.events.on('emote', ({ persistentId, emoteId }) => {
      const member = controller.snapshot().members.find((m) => m.persistentId === persistentId);
      const e = EMOTE_BY_ID[emoteId];
      if (!e) return;
      const key = createId(6);
      setEmotes((prev) => [...prev, { key, emoji: e.emoji, name: member?.isYou ? 'Du' : member?.name ?? '', x: Math.random() }]);
    });
  }, [controller]);

  // Confetti when everyone is ready.
  useEffect(() => {
    if (!controller) return;
    return controller.events.on('allReady', () => {
      Feedback.win();
      setBurst((b) => b + 1);
    });
  }, [controller]);

  // Navigate into the synchronized match when it starts.
  useEffect(() => {
    if (lobby?.status === 'in_game' && !navigatedRef.current) {
      navigatedRef.current = true;
      Feedback.whoosh();
      router.push('/online-game');
    }
    if (lobby?.status === 'lobby') navigatedRef.current = false;
  }, [lobby?.status, router]);

  if (error) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl }}>
          <Icon name="cloud-offline" size={56} color="danger" />
          <AppText variant="title" color="text" align="center">
            {error}
          </AppText>
          <GameButton label="Zurück" fullWidth={false} onPress={() => { leave(); router.replace('/'); }} />
        </View>
      </Screen>
    );
  }

  if (!lobby || status === 'connecting') {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Icon name="sync" size={40} color="primaryBright" />
          <AppText variant="subheading" color="textMuted">
            Verbinde…
          </AppText>
        </View>
      </Screen>
    );
  }

  const me = lobby.members.find((m) => m.isYou);
  const isHost = me?.isHost ?? false;
  const connected = lobby.members.filter((m) => m.connected);
  const joinUrl = Linking.createURL('online', { queryParams: { code: lobby.code } });

  const start = () => {
    if (!isHost || !selectedMode) return;
    const module = getModule(selectedMode);
    if (!module) return;
    const config = module.buildConfig({ difficulty: 'medium', options: module.defaultOptions ?? {} });
    Feedback.go();
    controller?.startGame({ modeId: selectedMode, seed: createId(12), config });
  };

  return (
    <Screen edges={['top', 'bottom']} maxContentWidth={760}>
      {burst > 0 && <Confetti key={burst} mode="rain" count={60} />}
      <FloatingEmotes items={emotes} onExpire={(key) => setEmotes((prev) => prev.filter((e) => e.key !== key))} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.sm }}>
        <IconButton name="chevron-down" size={42} onPress={() => { leave(); router.replace('/'); }} />
        <View style={{ alignItems: 'center' }}>
          <AppText variant="subheading" color="text">
            Lobby
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="people" size={12} color="textFaint" />
            <AppText variant="label" color="textFaint">
              {connected.length}/{lobby.maxPlayers}
            </AppText>
            {status === 'reconnecting' && <Tag label="RECONNECT" tone="hot" />}
          </View>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        {/* Members */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, rowGap: spacing.md, justifyContent: 'flex-start' }}>
          {lobby.members.map((m) => (
            <MemberTile key={m.persistentId} member={m} canManage={isHost} onKick={() => controller?.kick(m.persistentId)} />
          ))}
        </View>

        <InvitePanel code={lobby.code} joinUrl={joinUrl} />

        {/* Mode selection */}
        <View>
          <AppText variant="label" color="textFaint" uppercase style={{ marginBottom: spacing.sm }}>
            {isHost ? 'Spielmodus wählen' : 'Der Host wählt den Modus'}
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {READY_MODES.map((mode) => {
              const sel = selectedMode === mode.id;
              return (
                <PressableScale
                  key={mode.id}
                  feedback="select"
                  onPress={() => isHost && setSelectedMode(mode.id)}
                  disabled={!isHost}
                  scaleTo={0.94}
                >
                  <Card
                    padding="md"
                    radius="lg"
                    alt
                    style={{ alignItems: 'center', width: 96, gap: 2, borderColor: sel ? mode.color : 'transparent', borderWidth: 2, opacity: isHost || sel ? 1 : 0.6 }}
                  >
                    <AppText style={{ fontSize: 32 }}>{mode.emoji}</AppText>
                    <AppText variant="label" color="text" numberOfLines={1}>
                      {mode.title}
                    </AppText>
                  </Card>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>

        <ChatPanel messages={lobby.chat} selfId={lobby.selfPersistentId} onSend={(t) => controller?.sendChat(t)} />
        <EmoteBar onEmote={(id) => controller?.sendEmote(id)} />
      </ScrollView>

      {/* Footer */}
      <View style={{ padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm }}>
        <GameButton
          label={me?.ready ? 'Bereit ✓' : 'Bereit'}
          variant={me?.ready ? 'success' : 'secondary'}
          size="md"
          leftIcon={<Icon name={me?.ready ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={me?.ready ? 'onColor' : 'text'} />}
          onPress={() => controller?.setReady(!me?.ready)}
        />
        {isHost && (
          <GameButton
            label={lobby.allReady ? 'Alle bereit – Start!' : 'Spiel starten'}
            variant="primary"
            size="lg"
            disabled={connected.length < 1}
            leftIcon={<Icon name="play" size={22} color="onPrimary" />}
            onPress={start}
          />
        )}
      </View>
    </Screen>
  );
}
