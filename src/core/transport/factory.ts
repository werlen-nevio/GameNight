import { isWeb } from '../platform/platform';
import { steam } from '../steam';
import { BroadcastChannelTransport } from './BroadcastChannelTransport';
import { LoopbackTransport } from './LoopbackTransport';
import { WebSocketRelayTransport } from './WebSocketRelayTransport';
import { WebRtcTransport } from './WebRtcTransport';
import { SteamNetworkingTransport } from './SteamNetworkingTransport';
import { chooseTransportKind } from './transportPolicy';
import { RELAY_URL } from './config';
import type { Transport, TransportKind } from './types';

export { chooseTransportKind };

export interface TransportConfig {
  kind?: TransportKind;
  /** Relay/signaling endpoint; defaults to the configured `RELAY_URL`. */
  url?: string;
  /** Simulated latency (loopback only) for testing. */
  latencyMs?: number;
}

/**
 * Chooses the best available transport for the environment:
 *  - a real **WebSocket relay** when an endpoint is configured,
 *  - **BroadcastChannel** for server-less play across desktop browser tabs,
 *  - **loopback** otherwise (single runtime / tests).
 */
export function defaultTransportKind(): TransportKind {
  return chooseTransportKind({
    steamAvailable: steam.networking.available,
    relayUrl: RELAY_URL,
    web: isWeb,
    broadcastSupported: BroadcastChannelTransport.supported,
  });
}

/** Resolves the endpoint URL a networked transport should dial. */
export function resolveUrl(config?: TransportConfig): string | undefined {
  return config?.url ?? RELAY_URL;
}

/**
 * The single place a concrete transport is constructed. Swapping networking
 * backends (WebRTC, Photon, Colyseus, Steam, a dedicated server) is a change
 * here only — lobby, sync and game code are untouched.
 */
export function createTransport(config?: TransportConfig): Transport {
  const kind = config?.kind ?? defaultTransportKind();
  switch (kind) {
    case 'websocket':
      return new WebSocketRelayTransport();
    case 'broadcast':
      return BroadcastChannelTransport.supported
        ? new BroadcastChannelTransport()
        : new LoopbackTransport();
    case 'webrtc':
      return new WebRtcTransport();
    case 'steam':
      return steam.networking.available ? new SteamNetworkingTransport() : new WebRtcTransport();
    case 'loopback':
    default:
      return new LoopbackTransport({ latencyMs: config?.latencyMs });
  }
}
