import { Emitter } from '../events/emitter';
import { message } from '../events/protocol';
import type { NetworkClient } from '../network/NetworkClient';
import type { VoiceSignal, VoiceSignaling } from './types';

/**
 * Bridges {@link VoiceSignaling} onto the lobby's {@link NetworkClient} using
 * the dedicated `voice` channel. Voice signaling thus rides the same connection
 * as the game, but on a separate channel — voice stays fully isolated and the
 * game never sees these messages.
 */
export class LobbyVoiceSignaling implements VoiceSignaling {
  private peerSet = new Set<string>();
  private peersEmitter = new Emitter<{ change: string[] }>();
  private offs: Array<() => void> = [];

  constructor(private net: NetworkClient) {
    this.offs.push(
      net.events.on('open', ({ peers }) => {
        this.peerSet = new Set(peers);
        this.emitPeers();
      }),
      net.events.on('peerJoin', ({ id }) => {
        this.peerSet.add(id);
        this.emitPeers();
      }),
      net.events.on('peerLeave', ({ id }) => {
        this.peerSet.delete(id);
        this.emitPeers();
      }),
    );
  }

  get selfId(): string | null {
    return this.net.selfId;
  }

  send(to: string, data: VoiceSignal): void {
    this.net.send(message('voice', 'signal', data, { to }));
  }

  onSignal(handler: (from: string, data: VoiceSignal) => void): () => void {
    return this.net.events.on('message', (m) => {
      if (m.channel === 'voice' && m.type === 'signal' && m.from) handler(m.from, m.data as VoiceSignal);
    });
  }

  peers(): string[] {
    return [...this.peerSet];
  }

  onPeersChanged(handler: (peers: string[]) => void): () => void {
    return this.peersEmitter.on('change', handler);
  }

  private emitPeers(): void {
    this.peersEmitter.emit('change', [...this.peerSet]);
  }

  dispose(): void {
    this.offs.forEach((off) => off());
    this.offs = [];
  }
}
