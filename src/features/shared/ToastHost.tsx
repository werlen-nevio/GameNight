import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';

import { elevation, radii, spacing, zLayers } from '../../core/design/tokens';
import { AppText, Card, Icon, PressableScale, type IconName } from '../../core/ui';
import { Feedback } from '../../core/services';
import { useToastStore, type Toast, type ToastType } from '../../state/toastStore';

const TONE: Record<ToastType, { color: string; icon: IconName }> = {
  info: { color: '#9D5CFF', icon: 'information-circle' },
  success: { color: '#2BD576', icon: 'checkmark-circle' },
  error: { color: '#FF5470', icon: 'alert-circle' },
  invite: { color: '#22E0D6', icon: 'mail' },
};

/** Renders the global toast stack. Mounted once at the app root. */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <SafeAreaView
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: zLayers.toast, alignItems: 'center' }}
    >
      <View style={{ width: '100%', maxWidth: 460, paddingHorizontal: spacing.lg, gap: spacing.sm, paddingTop: spacing.sm }}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </SafeAreaView>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tone = TONE[toast.type];
  return (
    <Animated.View entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp} layout={Layout.springify()}>
      <Card
        padding="md"
        radius="lg"
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderColor: tone.color + '66', borderWidth: 1.5, ...elevation.md }}
      >
        <Icon name={toast.icon ?? tone.icon} size={22} color={tone.color} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" color="text" numberOfLines={1}>
            {toast.title}
          </AppText>
          {toast.message && (
            <AppText variant="caption" color="textMuted" numberOfLines={2}>
              {toast.message}
            </AppText>
          )}
        </View>
        {toast.action && (
          <PressableScale
            feedback="press"
            onPress={() => {
              Feedback.press();
              toast.action!.onPress();
              onDismiss();
            }}
            style={{ backgroundColor: tone.color, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}
          >
            <AppText variant="caption" color="#0A0614">
              {toast.action.label}
            </AppText>
          </PressableScale>
        )}
        <PressableScale feedback="tap" onPress={onDismiss} hitSlop={8}>
          <Icon name="close" size={18} color="textFaint" />
        </PressableScale>
      </Card>
    </Animated.View>
  );
}
