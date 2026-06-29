/**
 * A lightweight synchronized clock. The host's clock is authoritative; clients
 * estimate the host-time offset from request/response samples (à la NTP),
 * keeping the sample with the lowest round-trip for accuracy. `now()` then
 * returns host time on every device, so timers and animations line up.
 */
export class NetClock {
  private offset = 0; // hostTime - localTime (ms)
  private bestRtt = Infinity;

  constructor(private isHost: () => boolean) {}

  /** Estimated host time in ms. */
  now(): number {
    return Date.now() + (this.isHost() ? 0 : this.offset);
  }

  /** Incorporate one round-trip sample: t0 (client send), hostTime, t2 (recv). */
  ingestSample(t0: number, hostTime: number, t2: number): void {
    const rtt = t2 - t0;
    if (rtt < this.bestRtt) {
      this.bestRtt = rtt;
      this.offset = hostTime + rtt / 2 - t2;
    }
  }

  /** Round-trip estimate to the host (ms), or null before any sample. */
  get rttMs(): number | null {
    return this.bestRtt === Infinity ? null : Math.round(this.bestRtt);
  }

  reset(): void {
    this.offset = 0;
    this.bestRtt = Infinity;
  }
}
