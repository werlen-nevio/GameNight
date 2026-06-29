import { useLocalSearchParams } from 'expo-router';

import { OnlineHub } from '../features/online/OnlineHub';
import { LobbyScreen } from '../features/online/LobbyScreen';
import { useOnlineStore } from '../state/onlineStore';

/** Online entry: the create/join hub until connected, then the live lobby. */
export default function Online() {
  const { code, create } = useLocalSearchParams<{ code?: string; create?: string }>();
  const status = useOnlineStore((s) => s.status);
  const lobby = useOnlineStore((s) => s.lobby);

  const inLobby = lobby && (status === 'connected' || status === 'reconnecting');
  if (inLobby) return <LobbyScreen />;
  return <OnlineHub initialCode={code} initialCreate={create === '1'} />;
}
