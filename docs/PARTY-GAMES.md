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
4. Der **Host** startet ein Mehrspieler-Spiel: auf der Party-Seite unter
   „Play together“ oder auf der Spielseite mit „Play with party“.
5. Bei allen anderen Mitgliedern öffnet sich dasselbe Spiel **automatisch**.
   Wer gerade nicht im Launcher war, sieht beim nächsten Mal „Your party is
   playing … · Join game“.
6. Geht der Host zurück in den Launcher, ist das Party-Spiel beendet. Die
   Party selbst bleibt bestehen.
7. Einzelspieler-Spiele kann man auch in einer Party starten. Auf der
   Spielseite steht dann „Single player only. Your party will not join you.“

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

### 2. Die Party-Daten aus der Adresse lesen

Startet der Launcher ein Spiel für die Party, hängt er hinter `#` an die
Adresse des Spiels:

```
.../games/mein-spiel/#party=3F2A9C...&role=host&name=morris&players=2
```

| Angabe    | Bedeutung                                                                   |
| --------- | --------------------------------------------------------------------------- |
| `party`   | Gemeinsamer Raum-Code, für alle Mitglieder gleich (32 Zeichen, A–F und 0–9) |
| `role`    | `host` oder `guest`. Genau ein Mitglied ist Host                            |
| `name`    | Benutzername des Spielers, z. B. zum Anzeigen                               |
| `players` | Anzahl der Party-Mitglieder                                                 |

Lesen in JavaScript:

```js
const h = new URLSearchParams(location.hash.slice(1));
const party = h.get('party'); // null, wenn das Spiel normal gestartet wurde
const isHost = h.get('role') === 'host';
```

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

### 4. Ohne Party weiter funktionieren

Ohne `#party=...` wurde das Spiel allein gestartet (oder direkt über seine
eigene Adresse geöffnet). Dann wie bisher: eigenes Menü, Einzelspieler oder
was das Spiel sonst anbietet.

## Grenzen

- **Direktverbindungen klappen nicht in jedem Netz.** In manchen Firmen-,
  Schul- oder Mobilfunknetzen blockiert die Firewall WebRTC. Zu Hause
  funktioniert es fast immer. Zuverlässig wird es nur mit einem eigenen
  Weiterleitungs-Server (TURN), der meist Geld kostet.
- **Der öffentliche PeerJS-Server** (0.peerjs.com) ist kostenlos, aber ohne
  Garantie. Fällt er aus, können sich Spieler nicht finden.
- Die Party-Funktion braucht `0006_parties.sql` und `0007_party_host_tools.sql` (siehe
  [SUPABASE-SETUP.md](SUPABASE-SETUP.md)).
