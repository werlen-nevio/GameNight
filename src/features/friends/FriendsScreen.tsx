import { useState } from 'react';
import { Share, TextInput, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { radii, spacing } from '../../core/design/tokens';
import { useTheme } from '../../core/design/ThemeProvider';
import {
  AppText,
  Avatar,
  Card,
  GameButton,
  Icon,
  ModalHeader,
  Screen,
  SectionHeader,
  Tag,
} from '../../core/ui';
import { Feedback } from '../../core/services';
import { t } from '../../core/i18n';
import { createLobbyCode } from '../../core/utils/id';
import { EMOTE_BY_ID } from '../../domain';
import { usePlayerStore } from '../../state';

/**
 * The Online & Friends hub: create/share a private lobby code, prepare to join,
 * preview your emote loadout. Live sync & voice are scaffolded for a future
 * networked update — surfaced honestly rather than faked.
 */
export function FriendsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const player = usePlayerStore((s) => s.player);
  const [code] = useState(() => createLobbyCode());
  const [joinCode, setJoinCode] = useState('');

  const share = async () => {
    Feedback.tap();
    try {
      await Share.share({ message: `Spiel mit mir GameNight! Lobby-Code: ${code}` });
    } catch {
      /* user dismissed */
    }
  };

  return (
    <Screen edges={['top', 'bottom']} maxContentWidth={620}>
      <ModalHeader title={t.home.friends} onClose={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: 0, gap: spacing.xl }} showsVerticalScrollIndicator={false}>
        <GameButton
          label="Online-Lobby starten"
          size="lg"
          leftIcon={<Icon name="globe" size={22} color="onPrimary" />}
          onPress={() => router.push('/online')}
        />

        {/* Private lobby */}
        <View>
          <SectionHeader title={t.online.privateLobby} subtitle="Teile den Code mit Freunden" />
          <Card style={{ alignItems: 'center', gap: spacing.md }}>
            <AppText variant="label" color="textFaint" uppercase>
              {t.online.lobbyCode}
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {code.split('').map((c, i) => (
                <View
                  key={i}
                  style={{
                    width: 40,
                    height: 52,
                    borderRadius: radii.md,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText variant="heading" color="primaryBright">
                    {c}
                  </AppText>
                </View>
              ))}
            </View>
            <GameButton
              label={t.online.invite}
              variant="primary"
              size="md"
              leftIcon={<Icon name="share-social" size={20} color="onPrimary" />}
              onPress={share}
            />
          </Card>
        </View>

        {/* Join */}
        <View>
          <SectionHeader title={t.online.joinLobby} />
          <Card style={{ gap: spacing.md }}>
            <TextInput
              value={joinCode}
              onChangeText={(v) => setJoinCode(v.toUpperCase().slice(0, 6))}
              placeholder={t.online.enterCode}
              placeholderTextColor={theme.colors.textFaint}
              autoCapitalize="characters"
              style={{
                color: theme.colors.text,
                fontFamily: 'Baloo2_700Bold',
                fontSize: 22,
                letterSpacing: 6,
                textAlign: 'center',
                backgroundColor: 'rgba(0,0,0,0.25)',
                borderRadius: radii.md,
                paddingVertical: spacing.md,
              }}
            />
            <GameButton
              label={t.online.joinLobby}
              variant="secondary"
              size="md"
              disabled={joinCode.length < 6}
              onPress={() => Feedback.tap()}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center' }}>
              <Icon name="information-circle" size={14} color="textFaint" />
              <AppText variant="caption" color="textFaint">
                Live-Multiplayer & {t.online.voiceSoon}
              </AppText>
            </View>
          </Card>
        </View>

        {/* Emote loadout */}
        <View>
          <SectionHeader title={t.online.emotes} subtitle="Deine Emotes für Online-Partien" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {player.inventory.emotes.map((id) => {
              const e = EMOTE_BY_ID[id];
              if (!e) return null;
              return (
                <Card key={id} padding="sm" radius="lg" alt style={{ alignItems: 'center', width: 70, gap: 2 }}>
                  <AppText style={{ fontSize: 26 }}>{e.emoji}</AppText>
                  <AppText variant="label" color="textFaint" numberOfLines={1}>
                    {e.label}
                  </AppText>
                </Card>
              );
            })}
          </View>
        </View>

        {/* You */}
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar emoji="🎙️" size={44} />
          <View style={{ flex: 1 }}>
            <AppText variant="subheading" color="text">
              Voice-Chat
            </AppText>
            <AppText variant="caption" color="textFaint">
              Vorbereitet für ein kommendes Update
            </AppText>
          </View>
          <Tag label="BALD" tone="soon" />
        </Card>
      </ScrollView>
    </Screen>
  );
}
