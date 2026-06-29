import { ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { radii, spacing } from '../../../core/design/tokens';
import {
  AppText,
  Avatar,
  Card,
  Chip,
  GameButton,
  Icon,
  IconButton,
  PressableScale,
  SectionHeader,
} from '../../../core/ui';
import { Feedback } from '../../../core/services';
import { t } from '../../../core/i18n';
import {
  DIFFICULTY_ORDER,
  AVATAR_BY_ID,
  type Difficulty,
} from '../../../domain';
import { useLobbyStore } from '../../../state';
import type { GameModule } from './types';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: t.difficulty.easy,
  medium: t.difficulty.medium,
  hard: t.difficulty.hard,
  expert: t.difficulty.expert,
};

/**
 * The pre-game setup: configure who is playing (humans + KI bots), the
 * difficulty and any mode-specific options, then launch the match.
 */
export function Lobby({
  module,
  options,
  setOption,
  onStart,
  onClose,
}: {
  module: GameModule;
  options: Record<string, unknown>;
  setOption: (key: string, value: unknown) => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const { meta } = module;
  const seats = useLobbyStore((s) => s.seats);
  const difficulty = useLobbyStore((s) => s.difficulty);
  const addHuman = useLobbyStore((s) => s.addHuman);
  const addBot = useLobbyStore((s) => s.addBot);
  const removeSeat = useLobbyStore((s) => s.removeSeat);
  const setDifficulty = useLobbyStore((s) => s.setDifficulty);

  const full = seats.length >= meta.maxPlayers;
  const enough = seats.length >= meta.minPlayers;
  const difficulties = meta.difficulties ?? [];
  const Options = module.Options;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.sm }}>
        <IconButton name="chevron-down" onPress={onClose} size={42} />
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.colossal, gap: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.springify().damping(16)} style={{ alignItems: 'center', gap: spacing.sm }}>
          <LinearGradient
            colors={meta.gradient}
            style={{
              width: 96,
              height: 96,
              borderRadius: radii.xxl,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText style={{ fontSize: 52 }}>{meta.emoji}</AppText>
          </LinearGradient>
          <AppText variant="title" color="text" align="center">
            {meta.title}
          </AppText>
          <AppText variant="body" color="textMuted" align="center">
            {meta.tagline}
          </AppText>
        </Animated.View>

        {/* Players */}
        <View>
          <SectionHeader
            title={t.game.players}
            subtitle={`${seats.length}/${meta.maxPlayers} · min. ${meta.minPlayers}`}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {seats.map((seat) => (
              <Card key={seat.id} padding="md" radius="lg" style={{ alignItems: 'center', width: 92 }}>
                <View>
                  <Avatar emoji={AVATAR_BY_ID[seat.avatarId]?.emoji} size={52} />
                  {!seat.isYou && (
                    <PressableScale
                      feedback="tap"
                      onPress={() => removeSeat(seat.id)}
                      style={{ position: 'absolute', top: -6, right: -6 }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: '#FF5470',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name="close" size={14} color="onColor" />
                      </View>
                    </PressableScale>
                  )}
                  {seat.isBot && (
                    <View style={{ position: 'absolute', bottom: -4, alignSelf: 'center' }}>
                      <Icon name="hardware-chip" size={16} color="gem" />
                    </View>
                  )}
                </View>
                <AppText variant="caption" color="text" numberOfLines={1} style={{ marginTop: spacing.xs }}>
                  {seat.isYou ? t.common.you : seat.name}
                </AppText>
              </Card>
            ))}

            {!full && (
              <View style={{ gap: spacing.sm, justifyContent: 'center' }}>
                <AddSeat icon="person-add" label={t.game.addPlayer} onPress={addHuman} />
                {meta.supports.bots && (
                  <AddSeat icon="hardware-chip" label={t.game.addBot} onPress={addBot} />
                )}
              </View>
            )}
          </View>
        </View>

        {/* Difficulty */}
        {difficulties.length > 0 && (
          <View>
            <SectionHeader title={t.game.difficulty} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {DIFFICULTY_ORDER.filter((d) => difficulties.includes(d)).map((d) => (
                <Chip
                  key={d}
                  label={DIFFICULTY_LABEL[d]}
                  selected={difficulty === d}
                  accent={meta.color}
                  onPress={() => setDifficulty(d)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Mode-specific options */}
        {Options && (
          <View>
            <Options difficulty={difficulty} options={options} setOption={setOption} />
          </View>
        )}
      </ScrollView>

      <View style={{ padding: spacing.xl, paddingTop: spacing.sm }}>
        <GameButton
          label={enough ? t.common.start : `Mind. ${meta.minPlayers} Spieler`}
          variant="primary"
          size="lg"
          disabled={!enough}
          leftIcon={<Icon name="play" size={22} color="onPrimary" />}
          onPress={() => {
            Feedback.whoosh();
            onStart();
          }}
        />
      </View>
    </View>
  );
}

function AddSeat({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <PressableScale feedback="select" onPress={onPress}>
      <Card padding="sm" radius="lg" alt style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, width: 150 }}>
        <Icon name={icon} size={18} color="primaryBright" />
        <AppText variant="caption" color="text">
          {label}
        </AppText>
      </Card>
    </PressableScale>
  );
}
