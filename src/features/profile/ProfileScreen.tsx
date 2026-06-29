import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { radii, spacing } from '../../core/design/tokens';
import { useTheme } from '../../core/design/ThemeProvider';
import {
  AppText,
  Avatar,
  Card,
  Chip,
  Icon,
  IconButton,
  ModalHeader,
  PressableScale,
  Screen,
} from '../../core/ui';
import { Feedback } from '../../core/services';
import { t } from '../../core/i18n';
import {
  AVATAR_BY_ID,
  FRAME_BY_ID,
  TITLE_BY_ID,
  levelFromXp,
  rankForLevel,
} from '../../domain';
import { usePlayerStore } from '../../state';

type Tab = 'avatars' | 'frames' | 'titles';

export function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const player = usePlayerStore((s) => s.player);
  const equip = usePlayerStore((s) => s.equip);
  const rename = usePlayerStore((s) => s.rename);

  const level = levelFromXp(player.xp);
  const rank = rankForLevel(level.level);
  const [tab, setTab] = useState<Tab>('avatars');
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(player.name);

  const stats = player.stats;
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  return (
    <Screen edges={['top', 'bottom']}>
      <ModalHeader title={t.profile.title} onClose={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: 0, gap: spacing.xl }} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Avatar emoji={AVATAR_BY_ID[player.equipped.avatar]?.emoji} size={104} frame={FRAME_BY_ID[player.equipped.frame]?.gradient} />
          {editing ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                autoFocus
                maxLength={16}
                style={{
                  color: theme.colors.text,
                  fontFamily: 'Baloo2_700Bold',
                  fontSize: 22,
                  minWidth: 140,
                  textAlign: 'center',
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  borderRadius: radii.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                }}
              />
              <IconButton
                name="checkmark"
                size={38}
                onPress={() => {
                  rename(draftName);
                  setEditing(false);
                  Feedback.success();
                }}
              />
            </View>
          ) : (
            <PressableScale feedback="tap" onPress={() => { setDraftName(player.name); setEditing(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <AppText variant="title" color="text">
                {player.name}
              </AppText>
              <Icon name="pencil" size={16} color="textFaint" />
            </PressableScale>
          )}
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: rank.color + '26' }}>
            <AppText variant="caption" style={{ color: rank.color }}>
              {t.common.level} {level.level} · {TITLE_BY_ID[player.equipped.title]?.text ?? rank.title}
            </AppText>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <Stat icon="game-controller" color="#9D5CFF" label={t.profile.gamesPlayed} value={stats.gamesPlayed} />
          <Stat icon="trophy" color="#FFD23F" label={t.profile.wins} value={stats.wins} />
          <Stat icon="stats-chart" color="#22E0D6" label={t.profile.winRate} value={`${winRate}%`} />
          <Stat icon="flame" color="#FF8A3D" label={t.profile.bestStreak} value={stats.bestStreak} />
        </View>

        {/* Customization */}
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Chip label={t.profile.avatars} selected={tab === 'avatars'} onPress={() => setTab('avatars')} />
            <Chip label={t.profile.frames} selected={tab === 'frames'} onPress={() => setTab('frames')} />
            <Chip label={t.profile.titles} selected={tab === 'titles'} onPress={() => setTab('titles')} />
          </View>

          {tab === 'avatars' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {player.inventory.avatars.map((id) => (
                <SelectTile key={id} selected={player.equipped.avatar === id} onPress={() => { equip('avatar', id); Feedback.select(); }}>
                  <Avatar emoji={AVATAR_BY_ID[id]?.emoji} size={56} />
                </SelectTile>
              ))}
            </View>
          )}

          {tab === 'frames' && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {player.inventory.frames.map((id) => (
                <SelectTile key={id} selected={player.equipped.frame === id} onPress={() => { equip('frame', id); Feedback.select(); }}>
                  <Avatar emoji={AVATAR_BY_ID[player.equipped.avatar]?.emoji} size={56} frame={FRAME_BY_ID[id]?.gradient} />
                </SelectTile>
              ))}
            </View>
          )}

          {tab === 'titles' && (
            <View style={{ gap: spacing.sm }}>
              {player.inventory.titles.map((id) => (
                <PressableScale key={id} feedback="select" onPress={() => { equip('title', id); Feedback.select(); }}>
                  <Card padding="md" alt={player.equipped.title === id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="body" color="text">
                      {TITLE_BY_ID[id]?.text}
                    </AppText>
                    {player.equipped.title === id && <Icon name="checkmark-circle" size={22} color="success" />}
                  </Card>
                </PressableScale>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ icon, color, label, value }: { icon: any; color: string; label: string; value: string | number }) {
  return (
    <Card padding="md" style={{ width: '47%', gap: 2 }}>
      <Icon name={icon} size={22} color={color} />
      <AppText variant="title" color="text">
        {value}
      </AppText>
      <AppText variant="caption" color="textFaint">
        {label}
      </AppText>
    </Card>
  );
}

function SelectTile({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <PressableScale feedback={null} onPress={onPress} scaleTo={0.92}>
      <View
        style={{
          padding: spacing.xs,
          borderRadius: radii.lg,
          borderWidth: 2,
          borderColor: selected ? '#9D5CFF' : 'transparent',
          backgroundColor: selected ? 'rgba(157,92,255,0.14)' : 'transparent',
        }}
      >
        {children}
      </View>
    </PressableScale>
  );
}
