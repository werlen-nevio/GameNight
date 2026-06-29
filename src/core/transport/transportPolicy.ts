import type { TransportKind } from './types';

/**
 * Pure transport-selection policy (no imports, no side effects) so it can be
 * unit-tested in isolation. Steam P2P wins when present (a Steam build), then a
 * configured relay, then BroadcastChannel for server-less web tabs, then the
 * in-process loopback. Gameplay is identical across all of them.
 */
export function chooseTransportKind(env: {
  steamAvailable: boolean;
  relayUrl?: string | null;
  web: boolean;
  broadcastSupported: boolean;
}): TransportKind {
  if (env.steamAvailable) return 'steam';
  if (env.relayUrl) return 'websocket';
  if (env.web && env.broadcastSupported) return 'broadcast';
  return 'loopback';
}
