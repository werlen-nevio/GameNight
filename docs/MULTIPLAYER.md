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

## Cross-Platform

Spieler auf iPhone, Android, Tablet und Desktop-Browser spielen in derselben
Lobby. Es gibt **keine** plattformspezifische Spiellogik; die UI passt sich über
`useResponsive` und Plattform-/Eingabe-Erkennung automatisch an (zentrierte,
breitere Layouts und Pointer-Affordances am Desktop).
