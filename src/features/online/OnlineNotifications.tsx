import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { relayServices } from '../../core/network/sharedRelay';
import { Feedback } from '../../core/services';
import { useToastStore } from '../../state/toastStore';

/**
 * App-wide online notifications: lobby invites and matchmaking results surface
 * as toasts with a one-tap join action. Mounted once at the root; purely
 * reactive — no UI of its own.
 */
export function OnlineNotifications() {
  const router = useRouter();
  const show = useToastStore((s) => s.show);

  useEffect(() => {
    const offInvite = relayServices.events.on('invited', ({ name, lobbyCode }) => {
      Feedback.unlock();
      show({
        type: 'invite',
        title: 'Lobby-Einladung',
        message: `${name ?? 'Ein Freund'} lädt dich ein`,
        action: { label: 'Beitreten', onPress: () => router.push(`/online?code=${lobbyCode}`) },
      });
    });
    const offMatched = relayServices.events.on('matched', ({ lobbyCode }) => {
      show({
        type: 'success',
        title: 'Match gefunden!',
        action: { label: 'Los', onPress: () => router.push(`/online?code=${lobbyCode}`) },
      });
    });
    return () => {
      offInvite();
      offMatched();
    };
  }, [router, show]);

  return null;
}
