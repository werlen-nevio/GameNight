import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { radii, spacing } from '../../../core/design/tokens';
import { AppText, Avatar, Card, Icon, PressableScale, type IconName } from '../../../core/ui';
import { platformIcon } from '../../../core/platform/platform';
import type { LobbyMember } from '../../../core/lobby/types';

/** Connection-quality color from round-trip latency. */
function pingColor(rtt: number | null): string {
  if (rtt == null) return '#6A6388';
  if (rtt < 90) return '#2BD576';
  if (rtt < 220) return '#FFD23F';
  return '#FF5470';
}

/** A single player card in the lobby grid — Gartic-Phone style. */
export function MemberTile({
  member,
  canManage,
  onKick,
  speaking,
}: {
  member: LobbyMember;
  canManage: boolean;
  onKick: () => void;
  /** Highlights the avatar with a voice-activity ring. */
  speaking?: boolean;
}) {
  return (
    <Animated.View entering={ZoomIn.springify().damping(15)} exiting={FadeOut} style={{ width: '31%' }}>
      <Card
        padding="sm"
        radius="lg"
        style={{
          alignItems: 'center',
          gap: spacing.xs,
          borderColor: member.ready ? '#2BD576' : member.color + '55',
          borderWidth: 1.5,
          opacity: member.connected ? 1 : 0.5,
        }}
      >
        {/* Host crown */}
        {member.isHost && (
          <View style={{ position: 'absolute', top: -10, alignSelf: 'center', zIndex: 2 }}>
            <AppText style={{ fontSize: 18 }}>👑</AppText>
          </View>
        )}

        {/* Kick (host only, not self) */}
        {canManage && !member.isYou && (
          <PressableScale
            feedback="tap"
            onPress={onKick}
            style={{ position: 'absolute', top: -6, right: -6, zIndex: 2 }}
          >
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FF5470', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={13} color="onColor" />
            </View>
          </PressableScale>
        )}

        <View>
          {/* Voice speaking ring */}
          {speaking && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -4,
                left: -4,
                right: -4,
                bottom: -4,
                borderRadius: 30,
                borderWidth: 3,
                borderColor: '#2BD576',
                shadowColor: '#2BD576',
                shadowOpacity: 0.9,
                shadowRadius: 8,
              }}
            />
          )}
          <Avatar emoji={member.avatarEmoji} size={48} />
          {/* Ready check */}
          {member.ready && member.connected && (
            <Animated.View entering={ZoomIn.springify()} style={{ position: 'absolute', bottom: -2, right: -2 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#2BD576', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#140B33' }}>
                <Icon name="checkmark" size={12} color="onColor" />
              </View>
            </Animated.View>
          )}
        </View>

        <AppText variant="caption" color={member.isYou ? 'primaryBright' : 'text'} numberOfLines={1} style={{ maxWidth: 80 }}>
          {member.isYou ? 'Du' : member.name}
        </AppText>

        {/* Platform + ping */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Icon name={platformIcon(member.platform) as IconName} size={12} color="textFaint" />
          {member.connected ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pingColor(member.rttMs) }} />
              <AppText variant="label" color="textFaint" style={{ fontSize: 9 }}>
                {member.rttMs != null ? `${member.rttMs}ms` : '—'}
              </AppText>
            </View>
          ) : (
            <Animated.View entering={FadeIn}>
              <AppText variant="label" style={{ fontSize: 9, color: '#FF8A3D' }}>
                Reconnect…
              </AppText>
            </Animated.View>
          )}
        </View>
      </Card>
    </Animated.View>
  );
}
