import { Platform } from 'react-native';

import type { VoiceEngine, VoiceEngineOptions, VoiceSignal, VoiceSignaling } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The real WebRTC voice engine. One {@link RTCPeerConnection} per remote peer
 * carries a single Opus audio track; "perfect-negotiation"-style glare
 * avoidance (lower id initiates) keeps setup robust. On web it uses the browser
 * APIs directly; on native it lazily binds to `react-native-webrtc` if present,
 * else reports `available = false` (graceful — voice simply stays off).
 *
 * Per-peer volume, mute and level metering run through a Web Audio graph:
 *   remote stream → GainNode (volume) → destination, with an AnalyserNode tap.
 */
interface PeerCtx {
  pc: any;
  gain?: GainNode;
  analyser?: AnalyserNode;
  audioEl?: HTMLAudioElement;
  volume: number;
  muted: boolean;
  makingOffer: boolean;
}

function rtcBindings(): {
  RTCPeerConnection: any;
  mediaDevices: any;
} | null {
  if (typeof globalThis !== 'undefined' && (globalThis as any).RTCPeerConnection && (globalThis as any).navigator?.mediaDevices) {
    return {
      RTCPeerConnection: (globalThis as any).RTCPeerConnection,
      mediaDevices: (globalThis as any).navigator.mediaDevices,
    };
  }
  if (Platform.OS !== 'web') {
    try {
      // Optional native dependency, only present in a dev/native build. The
      // module name is computed so Metro does NOT statically resolve it (it
      // isn't bundled by default); the runtime require is caught if absent.
      const moduleName = ['react', 'native', 'webrtc'].join('-');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const req: (id: string) => any = (globalThis as any).require || require;
      const webrtc = req(moduleName);
      return { RTCPeerConnection: webrtc.RTCPeerConnection, mediaDevices: webrtc.mediaDevices };
    } catch {
      return null;
    }
  }
  return null;
}

export class WebRTCVoiceEngine implements VoiceEngine {
  private bindings = rtcBindings();
  private signaling: VoiceSignaling | null = null;
  private localStream: any = null;
  private audioCtx: AudioContext | null = null;
  private selfAnalyser: AnalyserNode | null = null;
  private peers = new Map<string, PeerCtx>();
  private opts: VoiceEngineOptions | null = null;
  private raf: ReturnType<typeof setInterval> | null = null;
  private offs: Array<() => void> = [];
  private deafened = false;

  get available(): boolean {
    return this.bindings != null;
  }

  async start(signaling: VoiceSignaling, opts: VoiceEngineOptions): Promise<void> {
    if (!this.bindings) throw new Error('voice_unavailable');
    this.signaling = signaling;
    this.opts = opts;

    this.localStream = await this.bindings.mediaDevices.getUserMedia({
      audio: {
        noiseSuppression: opts.noiseSuppression,
        echoCancellation: opts.echoCancellation,
        autoGainControl: opts.autoGainControl,
      },
      video: false,
    });

    this.setupSelfMeter();

    this.offs.push(
      signaling.onSignal((from, data) => this.onSignal(from, data)),
      signaling.onPeersChanged((peers) => this.syncPeers(peers)),
    );
    this.syncPeers(signaling.peers());
    this.startMeterLoop();
  }

  private setupSelfMeter() {
    const Ctx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (!Ctx) return; // native: no Web Audio; level metering disabled gracefully
    this.audioCtx = new Ctx();
    const src = this.audioCtx!.createMediaStreamSource(this.localStream);
    this.selfAnalyser = this.audioCtx!.createAnalyser();
    this.selfAnalyser.fftSize = 512;
    src.connect(this.selfAnalyser); // tap only — not routed to output (no local echo)
  }

  /** Connects to any new peers and drops any that left. */
  private syncPeers(peerIds: string[]) {
    const self = this.signaling?.selfId;
    const wanted = new Set(peerIds.filter((id) => id !== self));
    for (const id of wanted) if (!this.peers.has(id)) this.createPeer(id, true);
    for (const id of [...this.peers.keys()]) if (!wanted.has(id)) this.removePeer(id);
  }

  private createPeer(peerId: string, maybeInitiate: boolean): PeerCtx {
    const pc = new this.bindings!.RTCPeerConnection({ iceServers: this.opts!.iceServers });
    const ctx: PeerCtx = { pc, volume: 1, muted: false, makingOffer: false };
    this.peers.set(peerId, ctx);

    for (const track of this.localStream.getAudioTracks()) pc.addTrack(track, this.localStream);

    pc.onicecandidate = (e: any) => {
      if (e.candidate) this.signaling?.send(peerId, { kind: 'ice', candidate: e.candidate });
    };
    pc.ontrack = (e: any) => this.attachRemote(peerId, ctx, e.streams[0]);
    pc.onnegotiationneeded = async () => {
      try {
        ctx.makingOffer = true;
        await pc.setLocalDescription(await pc.createOffer());
        this.signaling?.send(peerId, { kind: 'offer', sdp: pc.localDescription.sdp });
      } catch {
        /* ignore */
      } finally {
        ctx.makingOffer = false;
      }
    };

    // Glare avoidance: the lexicographically smaller id initiates.
    if (maybeInitiate && this.signaling!.selfId! < peerId) {
      void pc.onnegotiationneeded?.();
    }
    return ctx;
  }

  private attachRemote(peerId: string, ctx: PeerCtx, stream: any) {
    if (this.audioCtx) {
      const src = this.audioCtx.createMediaStreamSource(stream);
      ctx.gain = this.audioCtx.createGain();
      ctx.gain.gain.value = this.deafened || ctx.muted ? 0 : ctx.volume;
      ctx.analyser = this.audioCtx.createAnalyser();
      ctx.analyser.fftSize = 512;
      src.connect(ctx.gain);
      ctx.gain.connect(this.audioCtx.destination);
      ctx.gain.connect(ctx.analyser);
    } else if (typeof (globalThis as any).Audio === 'function') {
      // Fallback playback without Web Audio (volume via element).
      const el = new (globalThis as any).Audio();
      el.srcObject = stream;
      el.autoplay = true;
      el.volume = this.deafened || ctx.muted ? 0 : ctx.volume;
      ctx.audioEl = el;
    }
    // Native (react-native-webrtc) plays remote tracks automatically.
  }

  private async onSignal(from: string, data: VoiceSignal) {
    let ctx = this.peers.get(from);
    if (!ctx) ctx = this.createPeer(from, false);
    const pc = ctx.pc;
    try {
      if (data.kind === 'offer') {
        await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
        await pc.setLocalDescription(await pc.createAnswer());
        this.signaling?.send(from, { kind: 'answer', sdp: pc.localDescription.sdp });
      } else if (data.kind === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
      } else if (data.kind === 'ice') {
        await pc.addIceCandidate(data.candidate);
      }
    } catch {
      /* transient negotiation error; ICE restart handles recovery */
    }
  }

  private startMeterLoop() {
    if (!this.opts) return;
    const buf = new Uint8Array(256);
    const rms = (an?: AnalyserNode) => {
      if (!an) return 0;
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      return Math.min(1, Math.sqrt(sum / buf.length) * 3);
    };
    this.raf = setInterval(() => {
      this.opts!.onLevel('self', rms(this.selfAnalyser ?? undefined));
      for (const [id, ctx] of this.peers) this.opts!.onLevel(id, rms(ctx.analyser));
    }, 100);
  }

  setMicEnabled(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((t: any) => (t.enabled = enabled));
  }

  setPeerVolume(peerId: string, volume: number): void {
    const ctx = this.peers.get(peerId);
    if (!ctx) return;
    ctx.volume = volume;
    if (ctx.gain) ctx.gain.gain.value = this.deafened || ctx.muted ? 0 : volume;
    if (ctx.audioEl) ctx.audioEl.volume = this.deafened || ctx.muted ? 0 : volume;
  }

  setPeerMuted(peerId: string, muted: boolean): void {
    const ctx = this.peers.get(peerId);
    if (!ctx) return;
    ctx.muted = muted;
    this.setPeerVolume(peerId, ctx.volume);
  }

  setDeafened(deafened: boolean): void {
    this.deafened = deafened;
    for (const [id, ctx] of this.peers) this.setPeerVolume(id, ctx.volume);
  }

  private removePeer(peerId: string) {
    const ctx = this.peers.get(peerId);
    if (!ctx) return;
    try {
      ctx.pc.close();
    } catch {
      /* ignore */
    }
    if (ctx.audioEl) ctx.audioEl.srcObject = null;
    this.peers.delete(peerId);
  }

  stop(): void {
    if (this.raf) clearInterval(this.raf);
    this.raf = null;
    this.offs.forEach((off) => off());
    this.offs = [];
    for (const id of [...this.peers.keys()]) this.removePeer(id);
    this.localStream?.getTracks().forEach((t: any) => t.stop());
    this.localStream = null;
    try {
      void this.audioCtx?.close();
    } catch {
      /* ignore */
    }
    this.audioCtx = null;
    this.selfAnalyser = null;
  }
}
