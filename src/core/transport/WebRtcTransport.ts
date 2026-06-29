import { Platform } from 'react-native';

import { Emitter } from '../events/emitter';
import { isNetMessage, message, type NetMessage, type PeerId } from '../events/protocol';
import type { ConnectOptions, Transport, TransportEvents, TransportState } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Real peer-to-peer transport over WebRTC DataChannels.
 *
 * The relay doubles as the signaling channel (offer/answer/ICE on a private
 * `rtcsig` channel) **and** the fallback path: app messages go P2P over the
 * DataChannel when it's open, and automatically fall back to relaying through
 * the server when a direct connection can't be established (restrictive NAT) or
 * is still negotiating. ICE uses STUN + optional TURN. Conforms to the same
 * {@link Transport} interface, so lobby, sync and game code are unchanged.
 */
function getRTC(): { RTCPeerConnection: any } | null {
  if (typeof globalThis !== 'undefined' && (globalThis as any).RTCPeerConnection) {
    return { RTCPeerConnection: (globalThis as any).RTCPeerConnection };
  }
  if (Platform.OS !== 'web') {
    try {
      const req: (id: string) => any = (globalThis as any).require || require;
      const webrtc = req(['react', 'native', 'webrtc'].join('-'));
      return { RTCPeerConnection: webrtc.RTCPeerConnection };
    } catch {
      return null;
    }
  }
  return null;
}

function iceServers(): any[] {
  const servers: any[] = [{ urls: ['stun:stun.l.google.com:19302'] }];
  const turn = process.env.EXPO_PUBLIC_TURN_URL;
  if (turn) {
    servers.push({ urls: turn, username: process.env.EXPO_PUBLIC_TURN_USERNAME, credential: process.env.EXPO_PUBLIC_TURN_CREDENTIAL });
  }
  return servers;
}

interface PeerLink {
  pc: any;
  dc: any | null;
  open: boolean;
}

export class WebRtcTransport implements Transport {
  readonly kind = 'webrtc' as const;
  readonly events = new Emitter<TransportEvents>();
  state: TransportState = 'idle';
  selfId: PeerId | null = null;
  rttMs: number | null = null;

  private ws: WebSocket | null = null;
  private rtc = getRTC();
  private links = new Map<PeerId, PeerLink>();
  private opts: ConnectOptions | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  private setState(s: TransportState) {
    this.state = s;
    this.events.emit('state', s);
  }

  connect(opts: ConnectOptions): Promise<void> {
    this.opts = opts;
    if (!opts.url) return Promise.reject(new Error('WebRtcTransport benötigt eine relay-URL für Signaling'));
    if (!this.rtc) return Promise.reject(new Error('WebRTC nicht verfügbar (Native: react-native-webrtc)'));
    this.setState('connecting');

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(opts.url!);
      this.ws = ws;

      ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', room: opts.room, create: !!opts.create, password: opts.password }));
      ws.onmessage = (ev: MessageEvent) => {
        let m: any;
        try {
          m = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
        } catch {
          return;
        }
        this.onRelay(m, () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        }, (e) => {
          if (!settled) {
            settled = true;
            reject(e);
          }
        });
      };
      ws.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error('relay_error'));
        }
      };
      ws.onclose = () => this.state !== 'closed' && this.setState('closed');
    });
  }

  private relaySend(obj: any) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(obj));
  }

  private onRelay(m: any, onReady: () => void, onError: (e: Error) => void) {
    switch (m?.t) {
      case 'welcome':
        this.selfId = m.selfId;
        this.setState('connected');
        this.startPing();
        for (const peer of m.peers as PeerId[]) this.createLink(peer, true);
        this.events.emit('open', { selfId: m.selfId, hostId: m.hostId, peers: m.peers, code: m.code });
        onReady();
        break;
      case 'error':
        this.setState('error');
        onError(new Error(m.reason));
        break;
      case 'join':
        this.createLink(m.id, false);
        this.events.emit('peerJoin', { id: m.id });
        break;
      case 'leave':
        this.dropLink(m.id);
        this.events.emit('peerLeave', { id: m.id });
        break;
      case 'host':
        this.events.emit('host', { id: m.id });
        break;
      case 'pong':
        this.rttMs = Date.now() - m.ts;
        break;
      case 'msg': {
        const inner = m.msg as NetMessage;
        if (inner?.channel === 'rtcsig') this.onSignal(m.from, inner.data as any);
        else if (isNetMessage(inner)) this.events.emit('message', { ...inner, from: m.from }); // relay fallback
        break;
      }
    }
  }

  private createLink(peerId: PeerId, initiator: boolean): PeerLink {
    if (this.links.has(peerId)) return this.links.get(peerId)!;
    const pc = new this.rtc!.RTCPeerConnection({ iceServers: iceServers() });
    const link: PeerLink = { pc, dc: null, open: false };
    this.links.set(peerId, link);

    pc.onicecandidate = (e: any) => {
      if (e.candidate) this.signal(peerId, { kind: 'ice', candidate: e.candidate });
    };
    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if (st === 'failed' || st === 'disconnected') {
        try {
          pc.restartIce?.();
        } catch {
          /* fall back to relay */
        }
      }
    };
    pc.ondatachannel = (e: any) => this.bindChannel(peerId, link, e.channel);

    if (initiator && this.selfId! < peerId) {
      const dc = pc.createDataChannel('gn', { ordered: true });
      this.bindChannel(peerId, link, dc);
      pc.createOffer()
        .then((offer: any) => pc.setLocalDescription(offer).then(() => this.signal(peerId, { kind: 'offer', sdp: offer.sdp })))
        .catch(() => {});
    }
    return link;
  }

  private bindChannel(peerId: PeerId, link: PeerLink, dc: any) {
    link.dc = dc;
    dc.onopen = () => {
      link.open = true;
    };
    dc.onclose = () => {
      link.open = false;
    };
    dc.onmessage = (e: any) => {
      try {
        const inner = JSON.parse(e.data) as NetMessage;
        if (isNetMessage(inner)) this.events.emit('message', { ...inner, from: peerId });
      } catch {
        /* ignore */
      }
    };
  }

  private signal(peerId: PeerId, data: unknown) {
    this.relaySend({ t: 'relay', to: peerId, msg: message('rtcsig', 'signal', data) });
  }

  private async onSignal(from: PeerId, data: any) {
    const link = this.createLink(from, false);
    const pc = link.pc;
    try {
      if (data.kind === 'offer') {
        await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.signal(from, { kind: 'answer', sdp: answer.sdp });
      } else if (data.kind === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
      } else if (data.kind === 'ice') {
        await pc.addIceCandidate(data.candidate);
      }
    } catch {
      /* negotiation retry via ICE restart */
    }
  }

  private dropLink(peerId: PeerId) {
    const link = this.links.get(peerId);
    if (!link) return;
    try {
      link.dc?.close();
      link.pc.close();
    } catch {
      /* ignore */
    }
    this.links.delete(peerId);
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => this.relaySend({ t: 'ping', ts: Date.now() }), 3000);
  }
  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  /** Sends P2P over the DataChannel when open; otherwise via the relay. */
  send(msg: NetMessage): void {
    if (this.state !== 'connected') return;
    const to = msg.to ?? 'all';
    const targets: PeerId[] =
      to === 'all'
        ? [...this.links.keys()]
        : to === 'host'
          ? [...this.links.keys()].slice(0, 1) // host resolved by sync layer via concrete id; symbolic falls back to relay
          : [to];
    for (const peerId of targets) {
      const link = this.links.get(peerId);
      if (link?.open && link.dc) {
        try {
          link.dc.send(JSON.stringify(msg));
          continue;
        } catch {
          /* fall through to relay */
        }
      }
      this.relaySend({ t: 'relay', to: to === 'all' ? 'all' : peerId, msg });
      if (to === 'all') break; // relay 'all' fan-out already covers everyone
    }
    if (to === 'host' && !this.links.size) this.relaySend({ t: 'relay', to: 'host', msg });
  }

  close(): void {
    this.stopPing();
    for (const id of [...this.links.keys()]) this.dropLink(id);
    this.relaySend({ t: 'bye' });
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.setState('closed');
    this.events.clear();
  }
}
