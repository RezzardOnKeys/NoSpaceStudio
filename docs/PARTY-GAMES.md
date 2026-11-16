# Party-Spiele: Mehrspieler über den Launcher

So funktioniert die Party im Launcher und was ein Spiel können muss, damit
Party-Mitglieder automatisch zusammen darin landen.

## Was die Spieler sehen

1. In der Seitenleiste gibt es den Bereich **Party**. Dort startet man eine
   Party und lädt Freunde aus der Freundesliste ein. Eingeladene sehen oben
   auf jeder Seite „… invited you to their party“ und einen Zähler an „Party“
   in der Navigation.
2. Wer in einer Party ist, sieht neben „Party“ in der Seitenleiste die
   **Profilbilder der Mitglieder übereinander gestapelt**, auf jeder Seite.
3. Auf der Party-Seite ist jeder als **Host** (Krone) oder **Member**
   gekennzeichnet. Der Host kann Mitglieder **entfernen** und einen anderen
   zum **Host machen**.
4. Spiele werden nur auf ihrer **Spielseite** gestartet (Store und Library
   führen dorthin). In einer Party hat der **Host** dort nur „Play with
   party“, allein spielen geht in einer Party nicht.
   Mitglieder sehen einen grauen Knopf mit „Only the party host can start
   games.“
5. Bei allen anderen Mitgliedern öffnet sich dasselbe Spiel **automatisch**.
   Wer gerade nicht im Launcher war, sieht beim nächsten Mal „Your party is
   playing … · Join game“.
6. Geht der Host zurück in den Launcher, ist das Party-Spiel beendet. Die
   Party selbst bleibt bestehen.
7. Einzelspieler-Spiele und Spiele, für die die Party zu groß ist, kann der
   Host nicht starten: Der Knopf ist grau und darunter steht der Grund
   („Single player only. Leave the party to play it.“ bzw. „Up to 2 players.
   Your party has 3.“). Wer allein ist (auch allein in einer Party), sieht
   den normalen „Play“-Knopf.

Eine Party hat höchstens 8 Mitglieder. Verlässt der Host die Party, wird das
Mitglied, das am längsten dabei ist, neuer Host.

## Wer was macht

| Teil          | Aufgabe                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| **Supabase**  | Wer ist in der Party, wer ist Host, welches Spiel läuft (Tabelle `parties`) |
| **Launcher**  | Zeigt die Party, zieht Mitglieder ins Spiel, gibt dem Spiel die Raumdaten   |
| **Das Spiel** | Verbindet die Spieler direkt miteinander, z. B. mit PeerJS                  |

Supabase und PeerJS stören sich nicht: Supabase organisiert nur, **wer
zusammen was spielt**. Die schnellen Spieldaten (Tastendrücke, Positionen)
schickt das Spiel selbst direkt von Spieler zu Spieler.

## Was ein Spiel dafür können muss

### 1. In `game.json` die Spielerzahl angeben

```json
"maxPlayers": 2
```

Ohne `maxPlayers` gilt das Spiel als Einzelspieler-Spiel (Wert 1). Ist die
Party größer als `maxPlayers`, kann der Host es nicht für alle starten.

Zwei weitere Angaben sind freiwillig, für Spiele, die nicht allein oder nur
in Zweierteams funktionieren:

```json
"minPlayers": 2,
"maxPlayers": 8,
"evenPlayers": true
```

| Angabe        | Standard | Bedeutung                                                     |
| ------------- | -------- | ------------------------------------------------------------- |
| `minPlayers`  | `1`      | So viele Spieler braucht das Spiel mindestens                 |
| `evenPlayers` | `false`  | `true`: Die Party muss eine gerade Zahl von Mitgliedern haben |

Der Launcher zeigt dann im Store „2–8“ statt „1–8“ und lässt den Play-Knopf
grau, solange die Party nicht passt. Darunter steht der Grund:

| Situation                              | Hinweis unter dem grauen Knopf                       |
| -------------------------------------- | ---------------------------------------------------- |
| Keine Party (oder allein in der Party) | „Needs a party of 2, 4, 6 or 8 players.“             |
| Host, Party kleiner als `minPlayers`   | „Needs at least 4 players. Your party has 3.“        |
| Host, ungerade Party bei `evenPlayers` | „Needs an even number of players. Your party has 3.“ |
| Host, Party größer als `maxPlayers`    | „Up to 8 players. Your party has 9.“                 |

Die Liste „2, 4, 6 or 8“ rechnet der Launcher aus den drei Angaben aus
(`src/features/games/players.ts`). Ist `minPlayers` größer als `maxPlayers`,
zeigt der Store eine Fehlermeldung, die die Datei nennt.

Wichtig: Der Launcher verhindert nur den Start über den Knopf. Wer die
Adresse des Spiels direkt öffnet, landet trotzdem allein darin. Ein solches
Spiel muss dann selbst einen Hinweis zeigen (siehe Abschnitt 4).

### 2. Die Party-Daten aus der Adresse lesen

Startet der Launcher ein Spiel für die Party, hängt er hinter `#` an die
Adresse des Spiels:

```
.../games/mein-spiel/#party=3F2A9C...&role=host&name=morris&players=2&avatar=https...
```

| Angabe    | Bedeutung                                                                   |
| --------- | --------------------------------------------------------------------------- |
| `party`   | Gemeinsamer Raum-Code, für alle Mitglieder gleich (32 Zeichen, A–F und 0–9) |
| `role`    | `host` oder `guest`. Genau ein Mitglied ist Host                            |
| `name`    | Benutzername des Spielers, z. B. zum Anzeigen                               |
| `players` | Anzahl der Party-Mitglieder                                                 |
| `avatar`  | Öffentlicher Link zum Profilbild des Spielers. Fehlt, wenn er keines hat    |

Lesen in JavaScript:

```js
const h = new URLSearchParams(location.hash.slice(1));
const party = h.get('party'); // null, wenn das Spiel normal gestartet wurde
const isHost = h.get('role') === 'host';
```

Jedes Spiel bekommt nur den **eigenen** Namen und das **eigene** Profilbild.
Wer die Mitspieler anzeigen will, schickt beides nach dem Verbinden an die
anderen (im WPM Trainer die Nachricht `hello`). Einen Bild-Link von einem
Mitspieler vor dem Anzeigen prüfen (nur `https://…`), siehe `safeImageUrl` in
`games/wpm-trainer/index.html`.

### 3. Damit verbinden, ohne eigenes Einlade-Menü

Mit PeerJS geht das so: Der **Host** meldet sich unter einer festen ID an, die
aus dem Raum-Code entsteht, z. B. `'mein-spiel-' + party`. Die **Gäste**
verbinden sich mit genau dieser ID.

Wichtig: Die Gäste können schneller geladen sein als der Host. Schlägt die
Verbindung mit `peer-unavailable` fehl, nach 1–2 Sekunden erneut versuchen
(einige Male), statt aufzugeben.

Ein vollständiges Beispiel ist `games/wpm-trainer/index.html`, Abschnitt
„NoSpaceStudio launcher integration“ sowie die Funktionen `createRoom` und
`joinRoom`.

Ein zweites, kleineres Beispiel ist `games/blind-drop/`: `net.js` enthält nur
die Verbindung (`openRoom` für den Host, `joinRoom` für Gäste, mit erneutem
Versuch und einem „Ping“ alle 2 Sekunden, damit ein geschlossener Tab bemerkt
wird). Dort ist der Host außerdem der Schiedsrichter (`host.js`): Gäste
schicken nur ihre Eingaben, und der Host schickt geheime Dinge (wo der
unsichtbare Gegner steht) erst, wenn sie aufgedeckt werden.

Ein drittes Beispiel für **viele Spieler** ist `games/die-together/` (bis zu
8, also 7 Gäste). Es nutzt dieselbe `net.js` und zeigt zusätzlich:

- **`players` aus der Adresse nutzen:** Das Menü weiß, wie viele noch fehlen
  („Waiting for 1 more player…“, „joining…“), und der Start-Knopf des Hosts
  bleibt aus, bis alle da sind (`startProblem` in `host.js`).
- **Nur Partys mit gerader Größe:** `"minPlayers": 2` und
  `"evenPlayers": true` in `game.json`; allein gestartet zeigt das Spiel nur
  einen Hinweis.
- **Schnelle Daten:** Der Host schickt 20-mal pro Sekunde den Stand aller
  Figuren, die Spieler schicken nur ihre Tasten bzw. ihre Blickrichtung und
  Schüsse. Damit der Host-Tab im Hintergrund nicht gebremst wird, läuft sein
  Takt über einen kleinen Web Worker (`ticker.js`).
- **Treffer trotz Verzögerung:** Jeder Bildschirm zeigt die anderen etwas
  verspätet. Ein Schuss nimmt deshalb mit, welchen Moment der Schütze
  gesehen hat (`seen`), und der Host prüft den Treffer gegen die Positionen
  von damals (höchstens 350 ms zurück, `poseAt` in `host.js`).

Ein viertes Beispiel für **viele gemeinsame Daten** ist `games/inkwars/`
(1 gegen 1). Dort bemalen beide Spieler dieselbe Arena. Statt die ganze
Farbfläche immer wieder zu schicken, schreibt der Host jeden Klecks mit und
der Gast wiederholt ihn genau gleich (`log` und `apply` in `paint.js`). Wer
später dazukommt oder neu lädt, bekommt die Farbfläche einmal komplett
(`exportState`). Damit sich der Gast ohne Verzögerung bewegt, rechnet er
seine eigene Figur selbst mit denselben Regeln, schickt die Tasten jedes
Schritts nummeriert an den Host (`feed.js`) und wird nur sanft korrigiert,
wenn beide auseinanderlaufen (`guest.js`). Die Liste aller Nachrichten
steht oben in `host.js`, Entscheidungen 39 und 40 erklären den Aufbau.

Ein fünftes Beispiel für **Dinge, die aus einer Zufallszahl entstehen**, ist
`games/dust-dash/` (1 gegen 1). Dort liegen 11.500
Dreckteile in der Halle. Der Host schickt sie nicht, sondern nur eine
Zufallszahl (den „Seed“) in der `start`-Nachricht; beide Browser bauen
daraus genau dieselben Teile mit denselben Nummern (`dirt.js`, dort wird
bewusst nur mit Summen und Wurzeln gerechnet, weil Sinus und Kosinus je
nach Browser minimal abweichen können). Danach schickt der Host nur noch
die Nummern der weggesaugten Teile, klein verpackt als Abstand von einer
Nummer zur nächsten (`packIds` in `wire.js`). Der Gast lässt Teile vor
seiner eigenen Düse sofort losfliegen („early“ in `guest.js`); zählt der
Host sie nicht innerhalb einer Sekunde, liegen sie wieder da. Wer neu lädt,
bekommt einmal die Liste aller fehlenden Teile (Nachricht `dirt`).
Entscheidung 44 erklärt den Aufbau.

### 4. Ohne Party weiter funktionieren

Ohne `#party=...` wurde das Spiel allein gestartet (oder direkt über seine
eigene Adresse geöffnet). Dann wie bisher: eigenes Menü, Einzelspieler oder
was das Spiel sonst anbietet. Ein Spiel mit `minPlayers` ab 2 zeigt in dem
Fall nur einen Hinweis, dass es eine Party braucht.

## Grenzen

- **Direktverbindungen klappen nicht in jedem Netz.** In manchen Firmen-,
  Schul- oder Mobilfunknetzen blockiert die Firewall WebRTC. Zu Hause
  funktioniert es fast immer. Zuverlässig wird es nur mit einem eigenen
  Weiterleitungs-Server (TURN), der meist Geld kostet.
- **Der öffentliche PeerJS-Server** (0.peerjs.com) ist kostenlos, aber ohne
  Garantie. Fällt er aus, können sich Spieler nicht finden.
- Die Party-Funktion braucht `0006_parties.sql` und `0007_party_host_tools.sql` (siehe
  [SUPABASE-SETUP.md](SUPABASE-SETUP.md)).
