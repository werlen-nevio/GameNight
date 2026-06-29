/**
 * A tiny, fully-typed event emitter. The backbone of every observable system in
 * the networking stack (transport, network client, lobby, sync). Listeners are
 * isolated: one throwing never blocks the others.
 */
export type Listener<T> = (payload: T) => void;

export class Emitter<Events extends object> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  /** Subscribe. Returns an unsubscribe function. */
  on<K extends keyof Events>(type: K, fn: Listener<Events[K]>): () => void {
    (this.listeners[type] ??= new Set()).add(fn);
    return () => this.off(type, fn);
  }

  /** Subscribe for a single emission. */
  once<K extends keyof Events>(type: K, fn: Listener<Events[K]>): () => void {
    const off = this.on(type, (payload) => {
      off();
      fn(payload);
    });
    return off;
  }

  off<K extends keyof Events>(type: K, fn: Listener<Events[K]>): void {
    this.listeners[type]?.delete(fn);
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.listeners[type];
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch (err) {
        // A faulty listener must never break the emit loop.
        // eslint-disable-next-line no-console
        console.warn('[Emitter] listener error', err);
      }
    }
  }

  /** Remove all listeners (e.g. on teardown). */
  clear(): void {
    this.listeners = {};
  }
}
