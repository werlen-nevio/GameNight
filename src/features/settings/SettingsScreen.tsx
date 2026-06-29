import { Alert, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

import { radii, spacing } from '../../core/design/tokens';
import { AppText, Card, Icon, ModalHeader, PressableScale, Screen, Toggle, type IconName } from '../../core/ui';
import { Feedback } from '../../core/services';
import { t } from '../../core/i18n';
import { usePlayerStore, useSettingsStore } from '../../state';

export function SettingsScreen() {
  const router = useRouter();
  const s = useSettingsStore();
  const resetProgress = usePlayerStore((st) => st.resetProgress);

  const confirmReset = () => {
    Alert.alert(t.settings.resetProgress, t.settings.resetConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: () => {
          resetProgress();
          Feedback.success();
        },
      },
    ]);
  };

  return (
    <Screen edges={['top', 'bottom']} decorative={false}>
      <ModalHeader title={t.settings.title} onClose={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: 0, gap: spacing.xl }} showsVerticalScrollIndicator={false}>
        <Section title={t.settings.audio}>
          <Row icon="volume-high" color="#22E0D6" label={t.settings.sound}>
            <Toggle value={s.sound} onChange={s.setSound} />
          </Row>
          <Row icon="musical-notes" color="#9D5CFF" label={t.settings.music}>
            <Toggle value={s.music} onChange={s.setMusic} />
          </Row>
          <Row icon="phone-portrait" color="#FF4D8D" label={t.settings.haptics}>
            <Toggle value={s.haptics} onChange={s.setHaptics} />
          </Row>
        </Section>

        <Section title={t.settings.gameplay}>
          <Row icon="film" color="#FF8A3D" label="Reduzierte Animationen">
            <Toggle value={s.reducedMotion} onChange={s.setReducedMotion} />
          </Row>
          <Row icon="language" color="#2BD576" label={t.settings.language} value="Deutsch" />
        </Section>

        <Section title={t.settings.account}>
          <Row icon="trash" color="#FF5470" label={t.settings.resetProgress} onPress={confirmReset} danger />
        </Section>

        <Section title={t.settings.about}>
          <Row icon="information-circle" color="#9A92B8" label={t.settings.version} value={appVersion()} />
          <Row icon="heart" color="#FF4D8D" label="GameNight" value="© 2026" />
        </Section>
      </ScrollView>
    </Screen>
  );
}

function appVersion(): string {
  return (Constants.expoConfig?.version as string) ?? '1.0.0';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" color="textFaint" uppercase style={{ marginLeft: spacing.xs }}>
        {title}
      </AppText>
      <Card padding="none" style={{ overflow: 'hidden' }}>
        {children}
      </Card>
    </View>
  );
}

function Row({
  icon,
  color,
  label,
  value,
  children,
  onPress,
  danger,
}: {
  icon: IconName;
  color: string;
  label: string;
  value?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radii.sm,
          backgroundColor: color + '26',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={20} color={color} />
      </View>
      <AppText variant="body" color={danger ? 'danger' : 'text'} style={{ flex: 1 }}>
        {label}
      </AppText>
      {value && (
        <AppText variant="caption" color="textFaint">
          {value}
        </AppText>
      )}
      {children}
      {onPress && !children && <Icon name="chevron-forward" size={18} color="textFaint" />}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale feedback="tap" onPress={onPress}>
        {inner}
      </PressableScale>
    );
  }
  return inner;
}
