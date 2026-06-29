/**
 * Networking configuration. The relay URL is read from the public env var
 * `EXPO_PUBLIC_RELAY_URL` (inlined at build time). When unset, the app uses
 * server-less transports (BroadcastChannel on web, loopback otherwise), so
 * everything still runs and demos without infrastructure.
 *
 * Run the reference server (`node server/relay.js`) and set, e.g.:
 *   EXPO_PUBLIC_RELAY_URL=ws://localhost:8080
 */
export const RELAY_URL: string | undefined =
  process.env.EXPO_PUBLIC_RELAY_URL && process.env.EXPO_PUBLIC_RELAY_URL.length > 0
    ? process.env.EXPO_PUBLIC_RELAY_URL
    : undefined;

/** Whether a real relay endpoint is configured. */
export const hasRelay = !!RELAY_URL;
