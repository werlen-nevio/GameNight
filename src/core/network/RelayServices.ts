import { Emitter } from '../events/emitter';

/**
 * A persistent account-level connection to the relay, separate from the
 * per-lobby transport. It powers auth tokens, friend presence, invites,
 * matchmaking and cloud-save — none of which are tied to being in a lobby.
 *
 * Degrades gracefully: with no relay URL configured the app stays fully
 * functional offline (local guest auth, local friends, no matchmaking).
 */
export interface RelayServicesEvents {
  state: 'connecting' | 'online' | 'offline';
  authed: { persistentId: string; token: string };
  presence: { id: string; state: string; lobbyCode: string | null };
  invited: { from: string; name?: string; lobbyCode: string };
  matched: { ticketId: string; lobbyCode: string; host: boolean };
  queued: { ticketId: string; qtype: string };
}

interface Identity {
  persistentId: string;
  name: string;
  token?: string;
  provider?: string;
}

export class RelayServices {
  readonly events = new Emitter<RelayServicesEvents>();
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private identity: Identity | null = null;
  private kvWaiters = new Map<string, (value: string | null) => void>();
  private reconnectAttempt = 0;
  private manualClose = false;

  get connected(): boolean {
    return this.ws?.readyState === 1;
  }

  /** Connects and authenticates. Resolves with the (possibly server-issued) identity. */
  connect(url: string, identity: Identity): Promise<{ persistentId: string; token: string }> {
    this.url = url;
    this.identity = identity;
    this.manualClose = false;
    return this.open();
  }

  private open(): Promise<{ persistentId: string; token: string }> {
    this.events.emit('state', 'connecting');
    return new Promise((resolve, reject) => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(this.url!);
      } catch (err) {
        this.events.emit('state', 'offline');
        return reject(err as Error);
      }
      this.ws = ws;
      let settled = false;

      ws.onopen = () => {
        this.send({ t: 'auth', persistentId: this.identity!.persistentId, name: this.identity!.name, token: this.identity!.token, provider: this.identity!.provider });
      };
      ws.onmessage = (ev: MessageEvent) => {
        let m: any;
        try {
          m = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
        } catch {
          return;
        }
        this.handle(m, (authed) => {
          if (!settled) {
            settled = true;
            this.reconnectAttempt = 0;
            this.events.emit('state', 'online');
            resolve(authed);
          }
        });
      };
      ws.onerror = () => {
        if (!settled) {
          settled = true;
          reject(new Error('relay_unreachable'));
        }
      };
      ws.onclose = () => {
        this.events.emit('state', 'offline');
        if (!this.manualClose) this.scheduleReconnect();
      };
    });
  }

  private scheduleReconnect() {
    const delay = Math.min(16000, 1000 * 2 ** this.reconnectAttempt++);
    setTimeout(() => {
      if (!this.manualClose) this.open().catch(() => {});
    }, delay);
  }

  private handle(m: any, onAuthed: (a: { persistentId: string; token: string }) => void) {
    switch (m?.t) {
      case 'authed':
        if (this.identity) this.identity.token = m.token;
        this.events.emit('authed', { persistentId: m.persistentId, token: m.token });
        onAuthed({ persistentId: m.persistentId, token: m.token });
        break;
      case 'presence':
        this.events.emit('presence', { id: m.id, state: m.state, lobbyCode: m.lobbyCode ?? null });
        break;
      case 'invited':
        this.events.emit('invited', { from: m.from, name: m.name, lobbyCode: m.lobbyCode });
        break;
      case 'matched':
        this.events.emit('matched', { ticketId: m.ticketId, lobbyCode: m.lobbyCode, host: !!m.host });
        break;
      case 'queued':
        this.events.emit('queued', { ticketId: m.ticketId, qtype: m.qtype });
        break;
      case 'kv': {
        const waiter = this.kvWaiters.get(m.key);
        if (waiter) {
          this.kvWaiters.delete(m.key);
          waiter(m.value ?? null);
        }
        break;
      }
    }
  }

  private send(msg: unknown) {
    if (this.connected) this.ws!.send(JSON.stringify(msg));
  }

  watch(ids: string[]): void {
    this.send({ t: 'watch', ids });
  }
  invite(to: string, lobbyCode: string): void {
    this.send({ t: 'invite', to, lobbyCode });
  }
  enqueue(qtype: string, modeId?: string): void {
    this.send({ t: 'queue', qtype, modeId });
  }
  dequeue(ticketId: string): void {
    this.send({ t: 'dequeue', ticketId });
  }

  kvSet(key: string, value: string): void {
    this.send({ t: 'kvset', key, value });
  }

  kvGet(key: string): Promise<string | null> {
    if (!this.connected) return Promise.resolve(null);
    return new Promise((resolve) => {
      this.kvWaiters.set(key, resolve);
      this.send({ t: 'kvget', key });
      setTimeout(() => {
        if (this.kvWaiters.delete(key)) resolve(null);
      }, 4000);
    });
  }

  close(): void {
    this.manualClose = true;
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.events.clear();
  }
}
