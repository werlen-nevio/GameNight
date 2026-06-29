# GameNight – Online-Multiplayer-Architektur

GameNight ist plattformübergreifend (iOS, Android, Tablet, Desktop-Browser) und
auf eine austauschbare Netzwerkschicht ausgelegt: **Spiellogik berührt niemals
Sockets** – sie sendet und empfängt nur Events. Dieselben Interfaces tragen
heute einen WebSocket-Relay und morgen WebRTC, Photon, Colyseus, Steam oder
einen dedizierten Server – ohne Änderung am Gameplay.

## Schichten

```
features/online            UI: Hub, Lobby, synchronisierter Match-Flow
state/onlineStore          Brücke zu React
        │
core/lobby   LobbyController   Präsenz, Ready, Kick, Host-Transfer, Chat, Reconnect
core/sync    SyncEngine        Host-autoritativ, geteilter Seed (RNG), NetClock
core/network NetworkClient     Lebenszyklus + Reconnect (Backoff, 2-Min-Fenster)
        │
core/transport   Transport-Interfaces + Implementierungen + Factory
core/events      NetMessage-Protokoll, typsicherer Emitter, GameEvent-Typen
```

Jede Schicht hat **eine** Verantwortung. Nichts oberhalb von `core/transport`
weiß, *wie* Bytes übertragen werden.

## Transports (austauschbar)

| Transport | Status | Einsatz |
| --- | --- | --- |
| `LoopbackTransport` | ✅ | In-Process; Tests & Single-Runtime-Demos |
| `WebSocketRelayTransport` | ✅ | Echtes Netzwerk über Relay-URL (Web + Native) |
| `BroadcastChannelTransport` | ✅ | Server-los über Browser-Tabs (Desktop) |
| `WebRtcTransport` | 🔌 vorbereitet | P2P + Relay-Fallback (Signaling über Relay) |
| `SteamTransport` | 🔌 vorbereitet | Steam Networking / Lobbies (nativer Build) |

Der Transport wird an **einer** Stelle erzeugt – `createTransport()` in
`core/transport/factory.ts`. Standard:
- `WebSocketRelayTransport`, wenn `EXPO_PUBLIC_RELAY_URL` gesetzt ist,
- sonst `BroadcastChannelTransport` im Browser,
- sonst `LoopbackTransport`.

## Host-Autorität & Determinismus

- **Autorität:** Der Host ist der Serialisierungspunkt. Clients senden ihre
  `GameEvent`s an den Host; der Host stempelt sie und sendet sie an alle zurück –
  jedes Gerät verarbeitet **einen** identischen, geordneten Event-Stream.
- **Determinismus:** Ein einziger Seed (beim Matchstart verteilt) treibt eine
  geteilte `Rng` auf allen Geräten – identische Fragen, Reihenfolge und Zufall.
- **Zeit:** `NetClock` schätzt den Host-Zeit-Offset (NTP-artig), damit Timer und
  Animationen synchron laufen.

## Lobby

`LobbyController` verwaltet:
- Präsenz (Hello/Reply), Ready-System, Spielerfarben/Avatare/Plattform/Ping,
- **Host-Transfer** (app-seitig, unabhängig vom Transport-Host),
- **Kick**,
- **Reconnect-Gnadenfrist von 2 Minuten:** Mitglieder sind über eine stabile
  `persistentId` verschlüsselt; ein wiederkehrender Spieler (neue Transport-ID)
  übernimmt seinen Slot. Der Host entfernt einen Slot erst nach Ablauf der Frist.

## So funktioniert Online für bestehende Modi (ohne Rewrite)

Alle bestehenden Modi sind deterministisch aus einem Seed. Der Online-Flow nutzt
das aus:

1. Der Host wählt Modus + Seed und sendet `start`.
2. **Jedes** Gerät spielt denselben geseedeten Inhalt **solo** (gleiche Fragen).
3. Bei `onComplete` sendet jeder Client ein `PlayerFinished`-Event mit seinem Score.
4. Der Host aggregiert eine autoritative Rangliste (`MatchResults`).
5. Alle sehen denselben animierten `ResultsScreen` mit allen Spielern.

So funktionieren **Stadt Land Fluss, Wer wird Millionär, Schlag den Raab,
Higher or Lower und Der Preis ist heiß** online – ohne ihren Code zu ändern.

> Erweiterung: Für „echte" geteilte Echtzeit-Zustände (z. B. ein gemeinsames
> Buzzer-Quiz) implementiert ein Modus optional einen host-autoritativen Reducer
> über dieselbe `SyncEngine` – die Infrastruktur ist bereits vorhanden.

## Reference-Relay starten (geräteübergreifend)

Ein bewusst „dummer" Relay liegt bei. Er kennt weder Lobby noch Spiel:

```bash
node server/relay.js                       # lauscht auf ws://localhost:8080
EXPO_PUBLIC_RELAY_URL=ws://localhost:8080 npm run web
# oder für Geräte im LAN: ws://<deine-ip>:8080
```

Protokoll: `src/core/transport/relayProtocol.ts`. Ein End-to-End-Test
(`node scratchpad/relay-test.mjs` während der Entwicklung) prüft Join,
Host-Zuweisung, Broadcast/Direkt/Host-Routing, Ping/Pong und Host-Migration.

## Voice (vorbereitet, nicht implementiert)

`VoiceTransport` ist als Interface definiert; `NullVoiceTransport` ist aktiv.
WebRTC-/Discord-/Steam-Voice kann später eingebunden werden, ohne Lobby- oder
Gameplay-Code zu ändern.

## Production features

### Voice chat (`core/voice`) — fully isolated from gameplay
Real WebRTC voice: per-peer `RTCPeerConnection`s carrying an Opus track, mic
capture with **noise suppression + echo cancellation + AGC**, **push-to-talk**
and **voice-activation** gating, **mute self / deafen**, **per-peer volume +
mute**, **speaking indicators** (animated ring), and the mic permission flow.
Web uses the browser APIs directly; native binds to `react-native-webrtc` in a
dev/native build (graceful-off otherwise). Auto-join on lobby enter, auto-leave
on exit. Signaling rides the lobby's `voice` channel — gameplay never sees it.

### Real WebRTC data transport (`WebRtcTransport`)
P2P over DataChannels with the relay as signaling **and** fallback: messages go
direct when the channel is open, else relay through the server (NAT-safe). ICE
uses STUN + optional TURN; ICE-restart recovers dropped links. Same `Transport`
interface → game code unchanged.

### Production relay (`server/`)
Modular (no giant class): HMAC **auth tokens**, **heartbeats**, **rate limiting**
(token bucket), strict **message validation**, **permessage-deflate**, lobby
lifecycle with **password + privacy**, **presence + friend invites**,
**matchmaking queues**, a **cloud-save KV**, structured logs and **/health +
/metrics**. Stateless tokens + per-node metrics ⇒ horizontally scalable (swap
rooms/presence/kv for Redis to share state across nodes).

### Friends, presence & matchmaking
Local roster + **live presence** (online / in-lobby / playing), add-by-code,
favorites, block, **invite-to-lobby** (one-tap-join toast), recently-played, and
**Quick Play** matchmaking. Public/ranked queues run on the relay; private/invite
resolve to codes.

### Auth & cloud save
**Guest/Anonymous** fully implemented (persistent id + relay session token);
**Google/Apple/Steam** provider adapters wired to the same flow (activate with
credentials / native build). **Cloud save** syncs profile + settings via the
relay KV (last-write-wins; swappable for Firestore/Supabase/Redis).

### Anti-cheat
The host never trusts a client: self-reported scores are **clamped to the
legitimately achievable range** per match config (`scoreCap` per mode);
NaN/negative/impossible values are rejected. Host stays authoritative.

### Steam (`core/steam`)
Complete interface set — Lobbies, Networking, Friends, Invites, Rich Presence,
Overlay, Voice — with a null adapter; a desktop Steamworks build binds the same
surface, so the desktop version uses Steam seamlessly when available.

### Error handling
2-minute reconnection (exponential backoff) keeps the slot; a global **reconnect
overlay** covers dropped network / backgrounding / relay restart while the
game/lobby underneath resumes seamlessly.

### Tests
`npm test` runs the relay suite (23 assertions: auth, validation, rate limit,
password lobbies, presence, invites, matchmaking, KV, /health, host migration)
and the client suite (lobby host-election/migration + anti-cheat, 14). A stress
test (`npm run test:stress`) drives 40 simultaneous clients + matchmaking burst.

> Runtime-verified here: relay, lobby logic, anti-cheat, bundles (iOS + web).
> Needs external setup to run live: provider sign-in (client ids), Steamworks
> (native), live mic audio + TURN, and physical multi-device sessions.

## Cross-Platform

Spieler auf iPhone, Android, Tablet und Desktop-Browser spielen in derselben
Lobby. Es gibt **keine** plattformspezifische Spiellogik; die UI passt sich über
`useResponsive` und Plattform-/Eingabe-Erkennung automatisch an (zentrierte,
breitere Layouts und Pointer-Affordances am Desktop).
