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
| `WebRtcTransport` | ✅ | P2P + Relay-Fallback (Signaling über Relay) |
| `SteamNetworkingTransport` | ✅ | Steam P2P / Lobbies (nativer Steam-Build) |

Der Transport wird an **einer** Stelle erzeugt – `createTransport()` in
`core/transport/factory.ts`; die Auswahl steckt in der reinen Funktion
`chooseTransportKind()` (`transportPolicy.ts`, eigenständig getestet). Reihenfolge:
- `SteamNetworkingTransport`, wenn ein Steam-Build läuft (`steam.networking.available`),
- sonst `WebSocketRelayTransport`, wenn `EXPO_PUBLIC_RELAY_URL` gesetzt ist,
- sonst `BroadcastChannelTransport` im Browser,
- sonst `LoopbackTransport`.

Gameplay ist **transportunabhängig**: dieselben `NetMessage`-Frames laufen über
jeden Transport, daher ändert sich beim Wechsel auf Steam nichts an Lobby, Sync
oder Spielmodi.

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

### Security hardening (treat every client as malicious)
- **Lobby codes:** every lobby has an internal **128-bit id that is never sent to
  the client**; players only see a short, server-generated, high-entropy share
  code (`rooms.js`) mapped server-side. Codes **expire** (TTL + sweeper) and the
  host can **rotate** them; the old code dies instantly. Enumeration is infeasible.
- **Auth tokens** (`auth.js`): HMAC-SHA256, JWT-shaped, with `jti` **revocation**,
  **device binding** (`did`), short-lived **access** + long-lived **refresh**
  tokens, expiry and constant-time signature checks. The relay never trusts a
  client-supplied id.
- **Message validation** (`protocol.js`): schema + size caps per type; a
  monotonic per-connection **`seq` rejects replays/dups**, and inner-message
  timestamps must be within a sane window (**no replay / impossible timestamps**).
- **Rate limiting** (`ratelimit.js`): global token bucket **plus** per-type
  cooldowns (chat/emote/invite/join/voice) with automatic **temp mute** and
  disconnect of abusers.
- **Server-authoritative anti-cheat** (`matches.js`): the host registers a match;
  the server **validates, clamps and HMAC-signs** every result against per-mode
  caps + roster, denies `perfect` to untrusted entries, and consumes each match
  once (**reward/replay-safe**). Clients apply only server-approved scores.
- **Encryption at rest** (`crypto.js`): cloud saves are **AES-256-GCM** encrypted
  in the KV store (tamper ⇒ rejected); TLS protects transit.
- **Client authority:** `LobbyController` only honours kick / host-transfer /
  start **from the host**, and ready/emote only **from the player themselves** —
  forged frames are dropped.

### Friends, presence & matchmaking
Local roster + **live presence** (online / in-lobby / playing), add-by-code,
favorites, block, **invite-to-lobby** (one-tap-join toast), recently-played, and
**Quick Play** matchmaking. Public/ranked queues run on the relay; private/invite
resolve to codes.

### Auth & cloud save
**Guest/Anonymous** fully implemented (persistent id + relay session token);
**Steam** uses the live SteamID + persona + session ticket (server-validatable);
**Google/Apple** provider adapters wired to the same flow (activate with
credentials). **Cloud save** syncs profile + settings via the relay KV
(encrypted at rest) and, on Steam, via **Steam Cloud** with conflict resolution.

### Steam ecosystem (`core/steam`)
A complete, production-shaped Steamworks integration behind one
`SteamIntegration` interface, with a **null adapter** so every platform calls
Steam unconditionally (no-ops off-Steam) and a real **`SteamworksAdapter`**
(`steamworks.js`, resolved dynamically so the mobile/web bundle never depends on
it):

- **Auth:** SteamID, persona, avatar, **session ticket** for server-side validation.
- **Networking:** `SteamNetworkingTransport` over Steam P2P/lobbies — auto-selected
  by `chooseTransportKind()` when available, otherwise WebRTC/relay. Gameplay
  transport-independent.
- **Friends / Invites / Overlay:** friend list + state, invite + accept + join,
  overlay invite dialog / profile / web page / screenshots.
- **Rich Presence:** lobby status + `connect` string so friends join from the
  overlay; updated live as the lobby changes (`onlineStore`).
- **Achievements:** the 12 app achievements map to `ACH_*` Steam names and
  auto-unlock + show progress toasts, idempotently (`SteamSync`).
- **Stats:** games / wins / correct / perfect / streak / modes / coins / XP / level
  mirrored to Steam stats.
- **Steam Cloud:** profile saved/loaded with **conflict resolution** (favours the
  most-progressed profile).

`SteamSync` (the pure mapping) and the null adapter are unit-tested
(`tests/steam.test.ts`, 25 assertions) without a Steam runtime.

### Error handling
2-minute reconnection (exponential backoff) keeps the slot; a global **reconnect
overlay** covers dropped network / backgrounding / relay restart while the
game/lobby underneath resumes seamlessly.

### Tests
`npm test` runs four suites (**113 assertions**):
- **relay** (`test:relay`, 24): auth, validation, rate limit, password lobbies,
  presence, invites, matchmaking, KV, /health, host migration.
- **security** (`test:security`, 46): adversarial — replay attacks, packet
  injection, invalid signatures, spam/temp-mute, **lobby enumeration**, token
  expiry/revocation/device-binding, rotate (host-migration) exploits, reward
  exploits, fake scores, encryption at rest.
- **lobby** (`test:lobby`, 18): host election/migration, reconnection, anti-cheat
  and **forged-authority** exploit coverage.
- **steam** (`test:steam`, 25): null adapter surface, achievement/stat sync
  (idempotent), Steam Cloud conflict resolution + round-trip, transport selection.

A stress test (`npm run test:stress`) drives 40 simultaneous clients +
matchmaking burst.

> Runtime-verified here: relay, security, lobby logic, anti-cheat, Steam sync,
> bundles (iOS + web). Needs external setup to run live: provider sign-in (client
> ids), a Steamworks app id + the `steamworks.js` native module, live mic audio +
> TURN, and physical multi-device sessions.

## Cross-Platform

Spieler auf iPhone, Android, Tablet und Desktop-Browser spielen in derselben
Lobby. Es gibt **keine** plattformspezifische Spiellogik; die UI passt sich über
`useResponsive` und Plattform-/Eingabe-Erkennung automatisch an (zentrierte,
breitere Layouts und Pointer-Affordances am Desktop).
