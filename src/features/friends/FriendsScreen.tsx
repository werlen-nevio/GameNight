import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
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
  PressableScale,
  Screen,
  SectionHeader,
} from '../../core/ui';
import { Feedback } from '../../core/services';
import { t } from '../../core/i18n';
import type { Friend, FriendState } from '../../core/social/types';
import { useFriendsStore } from '../../state/friendsStore';
import { useOnlineStore } from '../../state/onlineStore';
import { toast } from '../../state/toastStore';

const STATE_COLOR: Record<FriendState, string> = {
  online: '#2BD576',
  in_lobby: '#22E0D6',
  playing: '#FF8A3D',
  offline: '#6A6388',
};
const STATE_LABEL: Record<FriendState, string> = {
  online: 'Online',
  in_lobby: 'In Lobby',
  playing: 'Im Spiel',
  offline: 'Offline',
};

export function FriendsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const friends = useFriendsStore((s) => s.friends);
  const recent = useFriendsStore((s) => s.recent);
  const load = useFriendsStore((s) => s.load);
  const add = useFriendsStore((s) => s.add);
  const remove = useFriendsStore((s) => s.remove);
  const toggleFavorite = useFriendsStore((s) => s.toggleFavorite);
  const invite = useFriendsStore((s) => s.invite);
  const lobby = useOnlineStore((s) => s.lobby);
  const [codeInput, setCodeInput] = useState('');

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = [...friends].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    const onA = a.state !== 'offline' ? 0 : 1;
    const onB = b.state !== 'offline' ? 0 : 1;
    return onA - onB;
  });

  const onInvite = (f: Friend) => {
    if (!lobby) {
      toast.info('Keine Lobby', 'Erstelle zuerst eine Online-Lobby, um einzuladen.');
      return;
    }
    invite(f.id, lobby.code);
    Feedback.success();
    toast.success('Eingeladen', `${f.name} wurde eingeladen`);
  };

  const addByCode = async () => {
    const id = codeInput.trim();
    if (id.length < 4) return;
    await add({ id, name: 'Freund', avatarEmoji: '🙂' });
    setCodeInput('');
    Feedback.success();
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

        {/* Add friend */}
        <Card style={{ gap: spacing.md }}>
          <SectionHeader title="Freund hinzufügen" subtitle="Per Freundescode" />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput
              value={codeInput}
              onChangeText={setCodeInput}
              placeholder="Code / ID"
              placeholderTextColor={theme.colors.textFaint}
              autoCapitalize="none"
              style={{
                flex: 1,
                color: theme.colors.text,
                fontFamily: 'Nunito_600SemiBold',
                fontSize: 15,
                backgroundColor: 'rgba(0,0,0,0.25)',
                borderRadius: radii.md,
                paddingHorizontal: spacing.md,
              }}
            />
            <PressableScale
              feedback="press"
              onPress={addByCode}
              style={{ width: 46, height: 46, borderRadius: radii.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="person-add" size={20} color="onPrimary" />
            </PressableScale>
          </View>
        </Card>

        {/* Friends list */}
        <View>
          <SectionHeader title="Freunde" subtitle={`${friends.filter((f) => f.state !== 'offline').length} online`} />
          {sorted.length === 0 ? (
            <Card style={{ alignItems: 'center', gap: spacing.xs }}>
              <AppText style={{ fontSize: 32 }}>👋</AppText>
              <AppText variant="caption" color="textFaint" align="center">
                Noch keine Freunde – füge welche per Code hinzu.
              </AppText>
            </Card>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {sorted.map((f) => (
                <Card key={f.id} padding="md" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View>
                    <Avatar emoji={f.avatarEmoji} size={40} />
                    <View
                      style={{
                        position: 'absolute',
                        bottom: -1,
                        right: -1,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: STATE_COLOR[f.state],
                        borderWidth: 2,
                        borderColor: theme.colors.surface,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong" color="text" numberOfLines={1}>
                      {f.name}
                    </AppText>
                    <AppText variant="label" style={{ color: STATE_COLOR[f.state] }}>
                      {STATE_LABEL[f.state]}
                    </AppText>
                  </View>
                  <PressableScale feedback="tap" onPress={() => toggleFavorite(f.id)} hitSlop={8}>
                    <Icon name={f.favorite ? 'star' : 'star-outline'} size={20} color={f.favorite ? 'coin' : 'textFaint'} />
                  </PressableScale>
                  {f.state !== 'offline' && (
                    <PressableScale feedback="press" onPress={() => onInvite(f)} hitSlop={8}>
                      <Icon name="paper-plane" size={20} color="primaryBright" />
                    </PressableScale>
                  )}
                  <PressableScale feedback="tap" onPress={() => remove(f.id)} hitSlop={8}>
                    <Icon name="close" size={18} color="textFaint" />
                  </PressableScale>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Recently played */}
        {recent.length > 0 && (
          <View>
            <SectionHeader title="Zuletzt gespielt" />
            <View style={{ gap: spacing.sm }}>
              {recent.map((r) => (
                <Card key={r.id} padding="md" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Avatar emoji={r.avatarEmoji} size={34} />
                  <AppText variant="body" color="text" style={{ flex: 1 }} numberOfLines={1}>
                    {r.name}
                  </AppText>
                  <PressableScale feedback="press" onPress={() => add({ id: r.id, name: r.name, avatarEmoji: r.avatarEmoji })} hitSlop={8}>
                    <Icon name="person-add" size={20} color="primaryBright" />
                  </PressableScale>
                </Card>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
