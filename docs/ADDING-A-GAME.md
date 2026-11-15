# Spiele und News hinzufügen

Spiele und News liegen als Dateien im Repo. Es gibt kein Admin-Panel und
keine Datenbank dafür: Datei anlegen, committen, pushen. Nach dem Push baut
Cloudflare die Seite automatisch neu.

Am einfachsten: Claude Code bitten, z. B. „Füge das Spiel im Ordner
`games/neon-drift` zum Store hinzu“ oder „Schreib einen News-Beitrag zu
Version 1.2 von Neon Drift“. Von Hand geht es so:

## Ein Spiel hinzufügen

### 1. Ordner anlegen

Den Ordner `games/_template/` kopieren und die Kopie umbenennen. Der
Ordnername ist der **Slug**: Er steht später in der Adresse
(`/games/neon-drift`) und ist der Name, unter dem die Datenbank die Spielzeit
speichert.

- Nur Kleinbuchstaben, Zahlen und Bindestriche: `neon-drift`, nicht
  `Neon Drift` oder `neon_drift`.
- **Nach der Veröffentlichung nicht mehr umbenennen.** Sonst verlieren alle
  Spieler ihre Spielzeit für dieses Spiel.

### 2. Das Spiel hineinlegen

Die Spieldateien in den Ordner legen. Der Einstieg muss `index.html` heißen.
Die Regeln für Spiele stehen in [games/README.md](../games/README.md).

### 3. Bilder dazulegen

Die Bilder kommen in denselben Ordner. Empfohlen ist das Format WebP (klein
und scharf), PNG und JPG gehen auch.

| Bild        | Wofür                               | Empfohlene Größe  |
| ----------- | ----------------------------------- | ----------------- |
| Cover       | Karte im Store (Hochformat)         | 600 × 800 Pixel   |
| Banner      | Großes Bild oben auf der Spielseite | 1920 × 1080 Pixel |
| Screenshots | Galerie auf der Spielseite          | 1280 × 720 Pixel  |

Ohne Cover zeigt der Store ein graues Platzhalterbild. Ohne Banner wird das
Cover verwendet.

### 4. `game.json` ausfüllen

Das ist der Eintrag im Store:

```json
{
  "title": "Neon Drift",
  "shortDescription": "Drift through a glowing city and beat your best time.",
  "genres": ["Arcade", "Racing"],
  "engine": "HTML5",
  "version": "1.0.0",
  "status": "draft",
  "publishedAt": "2026-11-20",
  "cover": "cover.webp",
  "banner": "banner.webp",
  "screenshots": ["screenshot-1.webp", "screenshot-2.webp"]
}
```

| Feld               | Pflicht | Bedeutung                                                                                                      |
| ------------------ | ------- | -------------------------------------------------------------------------------------------------------------- |
| `title`            | ja      | Angezeigter Name                                                                                               |
| `shortDescription` | ja      | Ein Satz für die Karte im Store                                                                                |
| `status`           | ja      | `draft` (nur lokal sichtbar) oder `published` (für alle sichtbar)                                              |
| `publishedAt`      | ja      | Datum der Veröffentlichung, `JJJJ-MM-TT`. Bestimmt die Sortierung „Newest“                                     |
| `genres`           | nein    | Liste für den Genre-Filter                                                                                     |
| `engine`           | nein    | Label, z. B. `HTML5`, `Unity`, `Godot`. Standard: `HTML5`                                                      |
| `version`          | nein    | Standard: `1.0.0`                                                                                              |
| `cover`, `banner`  | nein    | Dateinamen der Bilder im Spielordner                                                                           |
| `screenshots`      | nein    | Liste von Dateinamen                                                                                           |
| `maxPlayers`       | nein    | Höchstzahl Spieler in einer Party. Standard: `1` (nur Einzelspieler). Siehe [PARTY-GAMES.md](PARTY-GAMES.md)   |
| `minPlayers`       | nein    | Mindestzahl Spieler. Standard: `1` (geht auch allein). Ab `2` lässt sich das Spiel nur mit einer Party starten |
| `evenPlayers`      | nein    | `true`, wenn nur gerade Spielerzahlen gehen (Spiele in Zweierteams). Standard: `false`                         |

Achtung bei JSON: Texte stehen in doppelten Anführungszeichen, zwischen den
Einträgen steht ein Komma, **nach dem letzten Eintrag keines**.

### 5. Optional: lange Beschreibung

Eine Datei `description.md` im Spielordner wird auf der Spielseite unter
„About this game“ angezeigt. Sie ist in Markdown geschrieben (Überschriften,
Listen, **fett**). Fehlt sie, steht dort die Kurzbeschreibung.

### 6. Lokal ansehen

```bash
npm run dev
```

Auf <http://localhost:5173> erscheint das Spiel im Store, auch mit
`"status": "draft"`. Entwürfe sind nur lokal sichtbar, nie auf der echten
Seite.

Wenn in der `game.json` etwas nicht stimmt, zeigt der Store statt der Spiele
eine Fehlermeldung, die die Datei und das Feld nennt, z. B.
`games/neon-drift/game.json: "title" is missing or empty.`

### 7. Veröffentlichen

`"status"` auf `"published"` stellen, committen und pushen.

Ein Entwurf ist im Store unsichtbar, sein Ordner wird aber trotzdem
hochgeladen. Wer die direkte Adresse kennt, kann das Spiel öffnen. Was
wirklich geheim bleiben soll, gehört noch nicht in den `main`-Branch.

## Ein Spiel aktualisieren

Dateien im Spielordner ersetzen, `version` in der `game.json` erhöhen und am
besten einen News-Beitrag vom Typ `game_update` dazu schreiben (siehe unten).
Er erscheint dann auch als Patchnote auf der Spielseite.

## Einen News-Beitrag schreiben

Die Datei `news/_template.md` kopieren. Der Name der Kopie ist frei, sinnvoll
ist Datum plus Stichwort: `2026-11-20-neon-drift-1-2.md`. Er darf nicht mit
einem Unterstrich beginnen.

```markdown
---
title: Neon Drift 1.2 is here
type: game_update
date: 2026-11-20
game: neon-drift
version: 1.2.0
author: Morris
---

Two new tracks and a **ghost mode**.

- New: Harbor and Skyline
- Fixed: the timer no longer runs during the countdown
```

Oben zwischen den beiden `---`-Zeilen stehen die Angaben, darunter der Text
in Markdown.

| Angabe    | Pflicht               | Bedeutung                                                              |
| --------- | --------------------- | ---------------------------------------------------------------------- |
| `title`   | ja                    | Überschrift                                                            |
| `type`    | ja                    | `announcement`, `launcher_update` oder `game_update`                   |
| `date`    | ja                    | `JJJJ-MM-TT`. Liegt es in der Zukunft, erscheint der Beitrag erst dann |
| `game`    | nur bei `game_update` | Ordnername des Spiels                                                  |
| `version` | nein                  | Wird als kleines Label angezeigt                                       |
| `author`  | nein                  | Standard: der Name der Plattform                                       |

Ein Beitrag mit Datum in der Zukunft erscheint auf der echten Seite
automatisch, sobald das Datum erreicht ist. Lokal (`npm run dev`) ist er
sofort sichtbar. Geheim ist er bis dahin nicht: Der Text steckt schon im
ausgelieferten Code der Seite.

## Etwas löschen

Den Spielordner bzw. die News-Datei löschen, committen, pushen. Die
gespeicherte Spielzeit bleibt in der Datenbank, wird aber nirgends mehr
angezeigt.
