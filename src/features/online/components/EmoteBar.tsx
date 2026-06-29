import { ScrollView, View } from 'react-native';

import { radii, spacing } from '../../../core/design/tokens';
import { AppText, PressableScale } from '../../../core/ui';
import { EMOTE_BY_ID } from '../../../domain';
import { usePlayerStore } from '../../../state';

/** A quick row of the player's owned emotes to fling into the lobby. */
export function EmoteBar({ onEmote }: { onEmote: (emoteId: string) => void }) {
  const emotes = usePlayerStore((s) => s.player.inventory.emotes);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {emotes.map((id) => {
        const e = EMOTE_BY_ID[id];
        if (!e) return null;
        return (
          <PressableScale key={id} feedback="tap" onPress={() => onEmote(id)} scaleTo={0.85}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: radii.lg,
                backgroundColor: 'rgba(255,255,255,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ fontSize: 24 }}>{e.emoji}</AppText>
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}
