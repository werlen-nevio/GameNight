import type { RTCIceServerLike } from './types';

/**
 * ICE configuration for NAT traversal. A public STUN server is used by default;
 * a TURN relay (for symmetric NATs where P2P fails) is added when configured via
 * env. For production, point these at your own TURN (e.g. coturn) credentials.
 *
 *   EXPO_PUBLIC_TURN_URL=turn:turn.example.com:3478
 *   EXPO_PUBLIC_TURN_USERNAME=...   EXPO_PUBLIC_TURN_CREDENTIAL=...
 */
export function iceServers(): RTCIceServerLike[] {
  const servers: RTCIceServerLike[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const turn = process.env.EXPO_PUBLIC_TURN_URL;
  if (turn) {
    servers.push({
      urls: turn,
      username: process.env.EXPO_PUBLIC_TURN_USERNAME,
      credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

export const VAD_THRESHOLD = 0.06;
