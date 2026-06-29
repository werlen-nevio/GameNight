# GameNight – Architektur

Diese Datei beschreibt die Architektur von GameNight und wie man die App
erweitert. Leitprinzip: **strikte Schichten, klare Verträge, isolierte Module.**

## Schichten

Die Abhängigkeiten fließen nur in eine Richtung (oben darf unten nutzen, nie
umgekehrt):

```
app/        ── Routen & Komposition (expo-router)
  │
features/   ── Feature-Module (home, shop, profile, games/…)
  │
state/      ── Zustand-Stores (player, settings, lobby, daily)
  │
domain/     ── Modelle & Regeln, framework-unabhängig
  │
core/       ── Design-System, UI-Kit, FX, Services, Utils
```

- **`core/`** kennt weder Features noch Domain. Reines Fundament: Design-Tokens,
  UI-Primitive, Animationen, Audio/Haptik/Storage, Utilities.
- **`domain/`** enthält reine Daten & Logik (XP-Kurve, Wirtschaft, der
  `GameMode`-Vertrag, Spielermodell). Keine React-Komponenten, keine Stores.
- **`state/`** hält App-weiten Zustand in Zustand-Stores; persistiert via
  AsyncStorage. Die Wirtschaft (Match-Belohnungen, Level-Ups, Erfolge) lebt
  zentral in `playerStore.recordMatch`.
- **`features/`** sind eigenständige Module. Spiele liegen unter `features/games`.
- **`app/`** sind dünne Routen, die Feature-Screens komponieren.

## Design-System

Alle visuellen Werte kommen aus `core/design`:
- `tokens.ts` – Farben (`palette`), Abstände, Radien, Motion, Elevation.
- `typography.ts` – Schriftfamilien & benannte Textstile (`textVariants`).
- `theme.ts` / `ThemeProvider.tsx` – semantisches Theme + `AccentProvider`, mit
  dem ein Spielmodus seinen ganzen Teilbaum einfärbt.

Komponenten lesen **niemals** rohe Hex-Werte, sondern Theme-Farben/Tokens.

## Spiel-Framework

Jeder Modus erfüllt den `GameModule`-Vertrag
(`features/games/shared/types.ts`):

```ts
interface GameModule {
  meta: GameModeMeta;                 // Metadaten (Titel, Akzent, Spielerzahl …)
  rules: GameRules;                   // Regel-Screen-Inhalt
  Gameplay: ComponentType<GameplayProps>;
  Options?: ComponentType<GameOptionsProps>; // optionale Lobby-Optionen
  defaultOptions?: Record<string, unknown>;
  buildConfig(input): ResolvedConfig; // Schwierigkeit/Optionen → Match-Config
}
```

Die **`GameShell`** (`features/games/shared/GameShell.tsx`) ist modus-agnostisch
und steuert die Phasen:

```
Lobby → Regeln → Countdown → Gameplay → Ergebnis
```

Sie baut die `GameSession`, rendert die `Gameplay`-Komponente des Moduls, nimmt
deren `GameOutcome` entgegen, verrechnet Belohnungen über `playerStore` und zeigt
die animierte Ergebnis-Show (Podium, Konfetti, XP/Münzen, Level-Up, Erfolge).

`Gameplay` muss nur:
1. das Spiel spielen (eigene UI),
2. am Ende `onComplete({ scores, correctAnswers?, perfect?, rounds? })` rufen,
3. `onQuit()` für den Abbruch anbieten.

Punktevergabe, Ranking (`rankOutcome`), XP/Münzen, Level-Ups und Erfolge sind
**zentralisiert** – Modi kümmern sich nicht darum.

### Einen neuen Spielmodus hinzufügen

1. **Metadaten** in `features/games/catalog.ts` ergänzen (`MODE_IDS`, `MODE_META`,
   `MODE_ORDER`).
2. Einen Ordner `features/games/<mein-modus>/` anlegen mit:
   - `Gameplay`-Komponente (rendert das Spiel, ruft `onComplete`),
   - optional Daten-Dateien (typisiert),
   - `module.tsx`, das den `GameModule` exportiert.
3. Das Modul in `features/games/registry.ts` zu `MODULES` hinzufügen (**eine Zeile**).

Fertig: Der Modus erscheint im Grid, bekommt Lobby/Regeln/Countdown/Ergebnis
automatisch und ist als Tages-Challenge wählbar. Modi ohne Modul zeigen
automatisch einen „Bald verfügbar"-Screen.

## State & Persistenz

- `playerStore` – Profil, Inventar, Wirtschaft, Statistiken, Erfolge, Streak.
  `recordMatch` ist die einzige Stelle, an der ein Match Belohnungen erzeugt.
- `settingsStore` – spiegelt Audio/Haptik-Einstellungen direkt in die Services.
- `lobbyStore` – transient; Sitze, Schwierigkeit, baut die `GameSession`.
- `dailyStore` – abgeschlossene Tages-Challenges.

Persistierte Stores nutzen `zustand/middleware` `persist` mit dem
`zustandStorage`-Adapter (AsyncStorage, Namespace `@gamenight/`).

## Determinismus

`core/utils/random.ts` bietet eine seedbare RNG (`Rng`). Damit sind die
Tages-Challenge und (vorbereitet) Online-Matches reproduzierbar – gleicher Seed,
gleiche Fragen/Reihenfolge.

## Audio

`core/services/audio` kapselt expo-audio. Eine generierte SFX-Bank
(`assets/audio/sfx`) ist sofort einsatzbereit. Hintergrundmusik pro Modus ist
vorgesehen: Dateien in `assets/audio` ablegen und über die Sound-Bank
registrieren – die `AudioService`-API (Crossfade, Lautstärke) steht bereits.

## Konventionen

- Strikte Schichtgrenzen (siehe oben).
- Komponenten beziehen Farben/Abstände aus dem Theme/Tokens.
- Feedback (Haptik+Sound) immer über den `Feedback`-Helper, nie direkt.
- Inhalte (Kategorien, Fragen) leben in `data/`-Dateien, getrennt von Logik/UI.
- Deutsch ist Primärsprache; Strings in `core/i18n`.
