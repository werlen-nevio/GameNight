# 🎉 GameNight

**Die ultimative Party- & Gameshow-App.** Spiel mit Freunden und Familie hunderte
Runden in vielen verschiedenen Spielmodi – auf einem Gerät (Pass & Play) oder solo
gegen clevere KI-Gegner. Gebaut für iOS, Android und Tablets.

GameNight ist eine moderne, vollständig durchgestylte Mobile-App: flüssige
Animationen, haptisches Feedback, Soundeffekte, Konfetti & Feuerwerk, ein
Progressions-System mit XP, Leveln, Münzen, Erfolgen und ein Shop mit Skins,
Rahmen, Titeln, Emotes und Themes.

---

## ✨ Features

### Spielmodi
| Modus | Beschreibung | Status |
| --- | --- | --- |
| **Stadt Land Fluss** | 385+ Kategorien in 12 Paketen, Pass & Play + Solo vs. KI, Live-Timer, automatische Punktevergabe | ✅ Spielbar |
| **Wer wird Millionär** | 15-Fragen-Leiter mit 110+ Fragen, Gewinnstufen, alle 4 Joker (50:50, Publikum, Telefon, Tausch), TV-Spannung | ✅ Spielbar |
| **Schlag den Raab** | 6 blitzschnelle Minispiele: Reaktion, Kopfrechnen, Merken, Schätzen, Finger-Speed, Farben | ✅ Spielbar |
| **Higher or Lower** | 16 Kategorien, baue die längste Serie auf | ✅ Spielbar |
| **Der Preis ist heiß** | Schätze Produktpreise so genau wie möglich | ✅ Spielbar |
| **Logo Quiz / Bilder Quiz / Musik Quiz** | Angekündigt für kommende Updates | 🔜 Bald |

### Systeme
- **Progression** – XP, Level (bis 200), Ränge, Level-Up-Belohnungen
- **Wirtschaft** – Münzen & Gems, automatische Match-Belohnungen
- **Erfolge** – 12 Achievements mit Fortschritt und Belohnungen
- **Tägliche Challenge** – jeden Tag ein deterministisch gewählter Modus
- **Shop** – Avatare, Rahmen, Titel, Emotes & Themes nach Seltenheit
- **Profil** – Statistiken, Umbenennen, Kosmetik ausrüsten
- **Online & Freunde** – Lobby-Code, Einladen, Emote-Loadout (Live-Sync & Voice vorbereitet)
- **Einstellungen** – Sound, Musik, Vibration, reduzierte Animationen, Fortschritt zurücksetzen

### Polish
- Eigene „Candy"-Buttons mit Press-/Release-Animation, Glanz & Tiefe
- GPU-freundliches Konfetti, Feuerwerk, Shimmer und Count-Up
- Synchronisiertes haptisches & akustisches Feedback (`Feedback`-Helper)
- Generierte, sofort funktionierende SFX-Bibliothek (16 Sounds)
- Gradient-gefüllte Schrift (Masked) für Logo & Hero-Momente

---

## 🛠 Tech Stack

- **Framework:** [Expo](https://expo.dev) (SDK 56) + React Native 0.85 (New Architecture)
- **Sprache:** TypeScript (strict)
- **Navigation:** expo-router (dateibasiert, typed routes)
- **State:** Zustand + Persistenz (AsyncStorage)
- **Animation:** react-native-reanimated 4
- **Grafik:** react-native-svg, expo-linear-gradient, masked-view
- **Audio/Haptik:** expo-audio, expo-haptics
- **Schrift:** Baloo 2 (Display), Nunito (Body), Luckiest Guy (Impact)

---

## 🚀 Erste Schritte

```bash
npm install        # Abhängigkeiten installieren
npm start          # Expo-Dev-Server starten
# danach:
npm run ios        # iOS-Simulator (macOS)
npm run android    # Android-Emulator/-Gerät
npm run web        # Browser-Vorschau
```

Die App läuft in **Expo Go** (SDK 56) sowie in Dev-/Release-Builds. Für einen
Produktions-Build siehe [EAS Build](https://docs.expo.dev/build/introduction/).

### Qualität
```bash
npm run typecheck  # TypeScript ohne Emit prüfen
npm run lint       # ESLint via expo lint
```

---

## 🧱 Projektstruktur

```
src/
├── app/                # expo-router Routen (Home, Game-Host, Modals)
├── core/               # Framework-unabhängiges Fundament
│   ├── design/         # Tokens, Typografie, Theme, Gradients
│   ├── ui/             # Wiederverwendbare UI-Primitive
│   ├── fx/             # Konfetti, Feuerwerk, Shimmer, Count-Up
│   ├── services/       # Audio, Haptik, Storage, Feedback
│   ├── i18n/           # Deutsche Strings (erweiterbar)
│   ├── hooks/          # useCountdown, …
│   └── utils/          # IDs, seeded RNG, Formatierung
├── domain/             # Modelle & Regeln (Spieler, Progression, Spiel-Vertrag)
├── state/              # Zustand-Stores (player, settings, lobby, daily)
└── features/           # Feature-Module
    ├── home/           # Startseite
    ├── profile/ shop/ friends/ settings/
    └── games/          # Spiel-Framework + jeder Modus als eigenes Modul
```

Siehe [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) für Details und eine Anleitung,
**wie man einen neuen Spielmodus hinzufügt** (eine Datei + eine Zeile).

---

## 📦 Inhalte & Erweiterbarkeit

GameNight ist auf langfristiges Wachstum ausgelegt:
- Neue Spielmodi sind isolierte Module, die einen klaren `GameModule`-Vertrag erfüllen.
- Inhalte (Kategorien, Fragen, Datensätze) liegen in typisierten Daten-Dateien und
  lassen sich gefahrlos erweitern.
- Eigene Musik pro Modus ist architektonisch vorgesehen – Audiodateien werden in
  `assets/audio` abgelegt und in der Sound-Bank registriert.

---

_GameNight © 2026 – mit Liebe gebaut._ 🎈
