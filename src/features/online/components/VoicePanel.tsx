import { View } from 'react-native';

import { radii, spacing } from '../../../core/design/tokens';
import { AppText, Avatar, Card, Icon, PressableScale, SectionHeader, Slider } from '../../../core/ui';
import { Feedback } from '../../../core/services';
import { useOnlineStore } from '../../../state/onlineStore';
import { useVoiceStore } from '../../../state/voiceStore';

/** Voice controls: mute/deafen, PTT/VAD mode, and per-peer volume + mute. */
export function VoicePanel() {
  const lobby = useOnlineStore((s) => s.lobby);
  const voice = useVoiceStore((s) => s.voice);
  const setMode = useVoiceStore((s) => s.setMode);
  const setSelfMuted = useVoiceStore((s) => s.setSelfMuted);
  const setDeafened = useVoiceStore((s) => s.setDeafened);
  const setPttHeld = useVoiceStore((s) => s.setPttHeld);
  const setPeerVolume = useVoiceStore((s) => s.setPeerVolume);
  const setPeerMuted = useVoiceStore((s) => s.setPeerMuted);

  if (!voice.available) {
    return (
      <Card alt style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon name="mic-off" size={18} color="textFaint" />
        <AppText variant="caption" color="textFaint" style={{ flex: 1 }}>
          Voice-Chat: im Web sofort aktiv, auf Mobilgeräten im Dev-Build (react-native-webrtc).
        </AppText>
      </Card>
    );
  }

  const others = (lobby?.members ?? []).filter((m) => !m.isYou && m.connected);

  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title="Voice-Chat" subtitle={voice.permission === 'denied' ? 'Mikrofon verweigert' : undefined} />

      {/* Self controls */}
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Ctrl
            icon={voice.selfMuted ? 'mic-off' : 'mic'}
            label={voice.selfMuted ? 'Stumm' : 'Mic an'}
            active={!voice.selfMuted}
            danger={voice.selfMuted}
            onPress={() => { setSelfMuted(!voice.selfMuted); Feedback.tap(); }}
          />
          <Ctrl
            icon={voice.deafened ? 'volume-mute' : 'volume-high'}
            label="Taub"
            active={voice.deafened}
            danger={voice.deafened}
            onPress={() => { setDeafened(!voice.deafened); Feedback.tap(); }}
          />
          <Ctrl
            icon={voice.mode === 'ptt' ? 'radio-button-on' : 'pulse'}
            label={voice.mode === 'ptt' ? 'PTT' : 'Auto'}
            active
            onPress={() => { setMode(voice.mode === 'ptt' ? 'vad' : 'ptt'); Feedback.tap(); }}
          />
        </View>

        {voice.mode === 'ptt' && (
          <PressableScale
            feedback={null}
            onPressIn={() => setPttHeld(true)}
            onPressOut={() => setPttHeld(false)}
          >
            <View
              style={{
                paddingVertical: spacing.md,
                borderRadius: radii.lg,
                alignItems: 'center',
                backgroundColor: voice.selfSpeaking ? '#2BD576' : 'rgba(255,255,255,0.08)',
              }}
            >
              <AppText variant="bodyStrong" color={voice.selfSpeaking ? 'onColor' : 'text'}>
                {voice.selfSpeaking ? '🎙️ Sprich…' : 'Halten zum Sprechen'}
              </AppText>
            </View>
          </PressableScale>
        )}
      </Card>

      {/* Per-peer volume + mute */}
      {others.map((m) => {
        const p = voice.participants[m.peerId];
        return (
          <Card key={m.persistentId} padding="md" alt style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Avatar emoji={m.avatarEmoji} size={30} />
            <AppText variant="caption" color={p?.speaking ? 'success' : 'text'} style={{ width: 70 }} numberOfLines={1}>
              {m.name}
            </AppText>
            <View style={{ flex: 1 }}>
              <Slider value={p?.volume ?? 1} onChange={(v) => setPeerVolume(m.peerId, v)} color={m.color} />
            </View>
            <PressableScale feedback="tap" onPress={() => setPeerMuted(m.peerId, !(p?.muted ?? false))}>
              <Icon name={p?.muted ? 'volume-mute' : 'volume-medium'} size={20} color={p?.muted ? 'danger' : 'textMuted'} />
            </PressableScale>
          </Card>
        );
      })}
    </View>
  );
}

function Ctrl({ icon, label, active, danger, onPress }: { icon: any; label: string; active?: boolean; danger?: boolean; onPress: () => void }) {
  return (
    <PressableScale feedback={null} onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          paddingVertical: spacing.sm,
          borderRadius: radii.md,
          alignItems: 'center',
          gap: 2,
          backgroundColor: danger ? 'rgba(255,84,112,0.18)' : active ? 'rgba(157,92,255,0.18)' : 'rgba(255,255,255,0.06)',
        }}
      >
        <Icon name={icon} size={20} color={danger ? 'danger' : active ? 'primaryBright' : 'textMuted'} />
        <AppText variant="label" color={danger ? 'danger' : 'textMuted'}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}
