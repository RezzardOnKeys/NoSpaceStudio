# Protokoll

Hier steht jede Änderung am Projekt mit fortlaufender Versionsnummer. Die neueste Version steht oben. Claude Code führt diese Datei automatisch.

## Zu einer alten Version zurück

Jeder Eintrag, der schon committet wurde, hat unter **GitHub-Commit** einen kurzen Code (den „Hash“, z. B. `a1b2c3d`). Damit könnt ihr euch den Stand von damals ansehen. Diese Befehle führt ihr selbst im Terminal im Projektordner aus:

1. **Erst eure aktuelle Arbeit sichern.** Mit `git status` prüfen, ob es ungespeicherte Änderungen gibt. Wenn ja, zuerst committen. Sonst lässt git euch nicht wechseln oder ihr verliert den Überblick.
2. **Alte Version ansehen:** `git checkout a1b2c3d` (den Hash aus dem Eintrag einsetzen). Der Ordner sieht jetzt genau so aus wie damals. Git meldet „detached HEAD“. Das ist normal und heißt nur: Ihr schaut euch gerade einen alten Stand an.
3. Falls sich seitdem Pakete geändert haben: `npm install`, dann `npm run dev` zum Ausprobieren.
4. **Wieder zurück zum aktuellen Stand:** `git checkout main` (bzw. der Name eures Branches). Danach bei Bedarf wieder `npm install`.

Wichtig: Im alten Stand nichts ändern und nichts committen, nur ansehen. Wenn ihr eine alte Version dauerhaft wiederherstellen wollt, fragt vorher Claude, wie das sicher geht.

---

## Version 58 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Neuer Chat: alle Dateien auf den neuesten Stand bringen und einen Startprompt schreiben
**Änderungen:**
- README: Status (fünf Spiele, Online-Status) und Feature-Tabelle aktualisiert
- ROADMAP: Migrationen 0001 bis 0009 (0009 wurde vor dem Ausführen gepusht, mit Hinweis, wie man prüft, ob sie gelaufen ist), Phase 8 um schwebende Party-Hinweise und automatisches Verlassen ergänzt
- docs/PARTY-GAMES.md: Dust Dash ist kein Entwurf mehr
- Commit-Hash für Version 57 nachgetragen
- Startprompt für den neuen Chat geschrieben (steht im Chat, nicht als Datei)
**Geänderte Dateien:** README.md, docs/ROADMAP.md, docs/PARTY-GAMES.md, PROTOKOLL.md
**Commit-Message:** `[v58] docs: update project state for a new session`
**GitHub-Commit:** _ausstehend_

## Version 57 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Online-Status prüfen (Kollege war online, obwohl das Fenster nur irgendwo offen war); online nur bei echter Nutzung von Launcher oder Spiel; Party automatisch verlassen, wenn man offline geht; neuer Host bekommt eine kleine Nachricht mit Krone auf jedem Bildschirm; Party-Einladungen auf jedem Bildschirm; danach mehrfach auf Fehler prüfen und berichten
**Änderungen:**
- Ursache gefunden: Der Launcher meldete alle 30 Sekunden „online“, auch in einem Tab im Hintergrund, solange er offen war
- „Online“ heißt jetzt: Tab sichtbar (oder erst seit weniger als 30 Sekunden versteckt) und in den letzten 5 Minuten Maus, Tastatur oder Touch benutzt; im Spiel zählt ein Fenster im Vordergrund. Sonst meldet der Launcher einmal „weg“ und Freunde sehen sofort „Offline“; auch beim Schließen des Tabs
- Neue Migration `0009_active_status_and_party_cleanup.sql`: Spalte `active`, Funktion `report_away`, angepasste `report_status` und `friend_statuses`; wer länger als 3 Minuten offline ist, verlässt automatisch seine Party (als Host übernimmt das älteste Mitglied, ein laufendes Spiel wird gestoppt)
- Neue schwebende Hinweise oben rechts auf jedem Bildschirm, auch im Spiel (`PartyAlerts.tsx`): Party-Einladungen mit „Join party“, „Decline“ und „später“ (dann wartet sie oben in den normalen Seiten); Krone „You are now the party host“ für den neuen Host, 7 Sekunden
- Mehrere Tabs offen: ein Tab im Hintergrund meldet kein „weg“, solange in einem anderen Tab gerade gearbeitet wird
- Geprüft: lint, typecheck, build; Aktivitätsregeln mit einem Testskript (12 Fälle: Leerlauf, versteckter Tab, Spiel mit und ohne Fokus, zwei Tabs); SQL mehrfach von Hand durchgesehen; Launcher als Gast im Browser (Store, Spiel-Seite) ohne neue Fehler. Nicht getestet: alles mit Konto (ich kann mich nicht anmelden), also Status bei Freunden, Party-Aufräumen, Krone und Einladungskarten im echten Ablauf; die Migration ist noch nicht in Supabase ausgeführt
- Doku: Entscheidung 47, ROADMAP, CLAUDE.md, SUPABASE-SETUP.md (Tabelle), Datenschutzerklärung (Online-Status und Party)
**Geänderte Dateien:** supabase/migrations/0009_active_status_and_party_cleanup.sql (neu), src/features/presence/ (activity.ts neu, PresenceReporter.tsx, api.ts), src/features/party/ (PartyAlerts.tsx neu, invite-alerts.ts neu, PartyNotices.tsx), src/components/layout/RootLayout.tsx, src/types/database.ts, legal/privacy.md, docs/DECISIONS.md, docs/ROADMAP.md, docs/SUPABASE-SETUP.md, CLAUDE.md, PROTOKOLL.md
**Commit-Message:** `[v57] feat(presence): online only while active, leave parties when offline, party alerts on every screen`
**GitHub-Commit:** [`dae19af`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/dae19af)

## Version 56 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Dust Dash: nach Rundenende eine etwa 10 Sekunden lange, cinematische Kamerafahrt durch die Halle (nicht von oben wie Inkwars), damit man sieht, wie viel gesaugt wurde, danach erst der Sieger
**Änderungen:**
- Neue Datei `tour.js`: Wenn die Zeit um ist, fliegt die Kamera 10 Sekunden durch die Halle: tief an den sonnigen Fenstern entlang, über die Mitte nach oben, am Ende Blick über die ganze Halle aus der hinteren Ecke; sanfter Anfang und sanftes Ende
- Während der Fahrt: oben „TIME'S UP!“, unten ein Papierschild, das hochzählt, wie viel Prozent der Halle sauber sind und wie viele Teile gesaugt wurden (beide Spieler zusammen)
- Danach erscheint die Quittung wie bisher; „Again“ beim Host erst mit der Quittung
- Überspringen mit Klick oder einer neuen Taste (nur auf dem eigenen Bildschirm; eine noch gedrückte Taste aus dem Spiel zählt nicht)
- Bei „Bewegung reduzieren“ drei Standbilder statt der Fahrt
- Getestet: Skript (Kamera bleibt in der Halle, mindestens 0,75 m von jedem Hindernis), in Chrome allein (Fahrt mit Bildern am Anfang, in der Mitte und am Ende, Quittung danach, Überspringen per Klick) und als Party mit zwei Tabs (Fahrt und Zahlen bei Host und Gast, danach Quittung). Für den Test lief die Runde mit 20 Sekunden, der Wert steht wieder auf 240. Nicht getestet: Safari, echte Party über den Launcher, die Standbilder bei „Bewegung reduzieren“
- Spielversion 1.1.0 mit Patch Note, Entscheidung 46, ROADMAP und docs/DUST-DASH.md; Commit-Hash für Version 55 nachgetragen
**Geänderte Dateien:** games/dust-dash/ (neu: tour.js; geändert: game.js, hud.js, index.html, game.json), news/2026-11-16-dust-dash-1-1.md (neu), docs/DECISIONS.md, docs/ROADMAP.md, docs/DUST-DASH.md, PROTOKOLL.md
**Commit-Message:** `[v56] feat(dust-dash): camera flight through the hall at the end of a round`
**GitHub-Commit:** [`5f55fcb`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/5f55fcb)

## Version 55 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Inkwars: Schaut man etwas über die Bildschirmmitte, fliegen die Schüsse viel zu hoch; sie sollen sich verhalten wie unterhalb der Mitte. Dazu Frage, wo die Namen der Spieler gespeichert sind (in Supabase unter Authentication steht kein Display name)
**Änderungen:**
- Ursache: Über dem Horizont fand das Fadenkreuz keinen Boden, die Pistole zielte auf einen Punkt 40 m entfernt in der Luft und schoss dafür im Steilbogen (45 Grad und mehr)
- Jetzt verlässt ein Schuss die Pistole höchstens 0,42 rad (etwa 24 Grad) über der Blickrichtung (`weapon.aimLift` in `config.js`); bräuchte der Punkt unter dem Fadenkreuz mehr, zielt die Pistole auf den weitesten Punkt auf der Linie des Fadenkreuzes, den sie so flach erreicht
- Unterhalb des Horizonts bleibt alles gleich; der Winkel wächst jetzt gleichmäßig mit dem Blick, am Horizont 0,42 statt 0,79 rad, das Wasser fliegt dort höchstens 2,3 m statt 7 m über die Pistole. Preis: Auf flachem Boden trifft man genau bis etwa 20 m (vorher 28 m); etwas höher schauen reicht weiter
- Getestet: Skript (Schusswinkel und Landepunkt für jeden Blickwinkel, vorher und nachher, zwei Richtungen) und in Chrome allein gegen Bots (Schuss knapp über dem Horizont fliegt knapp über das Fadenkreuz). Nicht getestet: Party, Safari, Maus
- Spielversion 1.3.1 mit Patch Note, Entscheidung 45, ROADMAP; Commit-Hash für Versionen 51 bis 54 nachgetragen
- Frage beantwortet (ohne Änderung): Die Namen stehen in der Tabelle `profiles` (Spalte `username`), nicht in Authentication
**Geänderte Dateien:** games/inkwars/ (game.js, camera.js, config.js, game.json), news/2026-11-16-inkwars-1-3-1.md (neu), docs/DECISIONS.md, docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v55] fix(inkwars): keep shots close to the crosshair when looking above the horizon`
**GitHub-Commit:** [`d39a8e2`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/d39a8e2)

## Version 54 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Dust Dash: letzte Feinschliffe machen und das Spiel als erste Version online stellen; außerdem soll der Staubsauger am Boden bleiben und nicht in Hindernisse ragen
**Änderungen:**
- Bot für das Spiel allein (`bot.js`): drückt dieselben „Tasten“ wie ein Spieler, gleiche Geschwindigkeiten; läuft zur Lieferung, wenn sein Weg höchstens 1,15-mal so lang ist wie der des Spielers, saugt den nächsten sichtbaren Dreck, läuft sonst um Hindernisse herum zur dreckigsten Stelle; mit Pausen und langsamem Drehen schlagbar gemacht (allein etwa 4000–4600 Punkte pro Runde, ohne Bremsen waren es 6000); alle Zahlen unter `bot` in `config.js`
- Eigener Sauger neu: die Düse liegt jetzt wirklich auf dem Boden vor dem Spieler, ein Rohr führt zur Hand unten rechts; vor Wänden, Regalen, Kisten, Fässern und Pfosten wird sie eingezogen und ragt nie hinein (unter Werkbänke passt sie); gleiches bei der Figur des anderen Spielers; die Teile fliegen zur Düse am Boden
- Feinschliff: Sonnenstrahlen durch die vorderen Fenster mit hellem Fleck auf dem Boden, schwebender Staub im Licht, Düse sieht mit Power-up anders aus (breit, lila Leuchten bei starkem Sog, golden mit Leuchten)
- Cover und Banner (SVG), Store-Beschreibung, Patch Note `news/2026-11-16-dust-dash-1-0.md`
- Veröffentlicht: `game.json` auf Version 1.0.0 und `"status": "published"`
- Getestet: Skripte (Bot über volle Runden mit drei Startwerten: bleibt nie hängen, holt Kisten; Platz der Düse vor Regal und Wand; Party-Simulation erneut ohne Abweichung bei den Punkten) und in Chrome allein gegen den Bot (Bot sammelt Punkte und holt eine Kiste, Düse am Boden, Sonnenstrahlen). Nicht getestet: Party im Browser nach den letzten Änderungen (nur per Skript), Safari, echte Party über den Launcher, Maus, wie stark sich der Bot gegen einen Menschen anfühlt, Store-Seite im Launcher mit Cover und Banner (nur Build und die Bilder einzeln angesehen)
- Doku: Entscheidung 44 ergänzt, ROADMAP (Spiel fertig, Folgeideen), docs/DUST-DASH.md (Status), games/README.md
**Geänderte Dateien:** games/dust-dash/ (neu: bot.js, cover.svg, banner.svg; geändert: game.js, host.js, nav.js, hall.js, hallView.js, effects.js, viewModel.js, playerView.js, config.js, game.json, description.md), news/2026-11-16-dust-dash-1-0.md (neu), docs/DECISIONS.md, docs/ROADMAP.md, docs/DUST-DASH.md, games/README.md, PROTOKOLL.md
**Commit-Message:** `[v54] feat(games): publish Dust Dash 1.0.0 with the bot, polish and a nozzle that stays on the floor`
**GitHub-Commit:** [`fe27910`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/fe27910)

## Version 53 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Dust Dash Schritt 5: voller Party-Modus (Host als Schiedsrichter, Gast bewegt sich selbst voraus, Dreck und Kisten übers Netz, Neuladen mitten in der Runde)
**Änderungen:**
- Der Host entscheidet alles, was zählt: wer welches Teil bekommt, Punkte, Kisten, Power-ups. Beide Bildschirme zeigen denselben Dreck und dieselben Punkte
- Der Gast bewegt seine Figur sofort selbst mit denselben Regeln und schickt seine Tasten Schritt für Schritt (`feed.js`, `wire.js` von Inkwars übernommen und angepasst); der Host spielt jeden Schritt genau einmal ab, der Gast wird sanft korrigiert
- Dreck vor der eigenen Düse fliegt beim Gast sofort los; zählt der Host ein Teil nicht innerhalb einer Sekunde (der andere war schneller), liegt es wieder da
- Der Host schickt nur die Nummern der weggesaugten Teile (klein verpackt als Abstände), dazu Kiste, Power-ups und Punkte, etwa 30-mal pro Sekunde
- Neue Figur für den anderen Spieler (`playerView.js`): rund, große Augen, in seiner Farbe, Sauger auf dem Rücken mit Schlauch und Düse; hüpft beim Laufen, Düse zittert beim Saugen (nicht bei „Bewegung reduzieren“). Der Bot wird genauso gezeichnet (steht aber noch still)
- Neuladen mitten in der Runde: der Gast ist wieder in der laufenden Runde, mit seinen Punkten und ohne die schon weggesaugten Teile
- Behoben: nach dem Neuladen stand auf der Quittung „Player“ statt des Host-Namens
- Getestet: Skript mit künstlicher Verzögerung (0, 40–80, 100–150 ms je Richtung, 70 Sekunden): Punkte auf beiden Seiten immer gleich, jede Kiste auf beiden Seiten geöffnet, Nachzügler hat exakt dieselben Teile. In Chrome mit zwei Tabs: Gast läuft und saugt (Punkte kommen vom Host, auch bei verstecktem Host-Tab), beide sehen die Figur des anderen, Gast lädt neu und ist wieder drin, Gast öffnet die Kiste („ben got Golden nozzle“ beim Host), gleiches Ergebnis auf beiden Quittungen, „Again“ bringt beide ins Menü. Nicht getestet: Safari, echte Party über den Launcher mit zwei Konten und echtem Internet, Maus, volle 4-Minuten-Runde, dass der Host dem Gast ein Teil wegschnappt (nur im Skript)
- Entscheidung 44 ergänzt, ROADMAP, docs/DUST-DASH.md und docs/PARTY-GAMES.md (fünftes Beispiel) aktualisiert
**Geänderte Dateien:** games/dust-dash/ (neu: feed.js, wire.js, playerView.js; geändert: game.js, host.js, guest.js, sim.js, dirt.js, dirtView.js, config.js), docs/DECISIONS.md, docs/ROADMAP.md, docs/DUST-DASH.md, docs/PARTY-GAMES.md, PROTOKOLL.md
**Commit-Message:** `[v53] feat(dust-dash): full party mode with a guest that moves itself and shared dirt`
**GitHub-Commit:** [`fe27910`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/fe27910)

## Version 52 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Dust Dash: Halle vergrößern (statt kürzerer Runde), danach weiter mit Schritt 4 (Lieferkisten und Power-ups)
**Änderungen:**
- Halle von 40 × 26 m auf 56 × 36 m vergrößert, Hindernisse neu ausgelegt (pro Hälfte sechs Regale, drei Werkbänke, Kisten, Fässer, vier Pfosten; punktgespiegelt), 11500 statt 6000 Dreckteile (gleiche Dichte), Fenster, Balken, Licht und Schatten angepasst
- Gemessen: zwei perfekte Test-Sauger brauchen jetzt fast die vollen 4 Minuten (vorher 2:24); echte Spieler bekommen die Halle nicht mehr leer
- Lieferungen: oben links „Delivery in 0:24“; erste Kiste nach 25 s, danach 35 s nach dem Öffnen der letzten; Dachluke geht auf, Lichtstrahl zeigt die Stelle, Karton fällt und hüpft kurz
- Faire Stelle: freier Boden, für beide mindestens 9 m Laufweg und höchstens 2 m Unterschied (Laufwege um die Hindernisse herum, neue Datei `nav.js`)
- Liefer-Symbol mit Entfernung in Metern, auch durch Wände; liegt die Kiste hinter einem oder außerhalb des Bildes, sitzt es am Bildschirmrand mit Pfeil
- Wer die Kiste zuerst berührt, bekommt 10 Sekunden ein zufälliges Power-up (breite Düse, Turbo-Schuhe, starker Sog, goldene Düse = doppelte Punkte); nicht stapelbar, ein neues ersetzt das alte; großes Wort in der Mitte („Turbo shoes!“), beim anderen ein Papierstreifen („Ben got Turbo shoes“); Karte unten links mit ablaufendem Balken; Funken beim Öffnen
- Der Staubfilm wird passend zur aktuellen Düsenfläche gewischt (breiter bzw. länger mit Power-up)
- Getestet: Skripte (Halle ohne Überschneidungen und überall erreichbar, 300 faire Stellen, Ablauf Timer → Fallen → Warten → Öffnen → 10 s → 35 s, Wirkung aller vier Power-ups) und in Chrome allein (Kiste fällt, Symbol und Pfeil am Rand, automatisch hingelaufen und geöffnet, Power-up-Karte läuft ab, nächster Timer) sowie Party mit zwei Tabs (Start, Lieferung erscheint bei beiden). Dabei ein Rundungsfehler in der Wegsuche gefunden und behoben. Nicht getestet: Maus, Safari, echte Party über den Launcher, volle 4-Minuten-Runde. In der Party hat jeder noch eigene Kisten, eigenen Dreck und eigene Punkte (Schritt 5); der Bot steht still (Schritt 6); die Düse sieht mit Power-up noch gleich aus (Schritt 7)
- Entscheidung 44 ergänzt, ROADMAP und docs/DUST-DASH.md aktualisiert
**Geänderte Dateien:** games/dust-dash/ (neu: nav.js, effects.js, marker.js; geändert: hall.js, hallView.js, scene.js, sim.js, host.js, guest.js, game.js, hud.js, config.js, index.html), docs/DECISIONS.md, docs/ROADMAP.md, docs/DUST-DASH.md, PROTOKOLL.md
**Commit-Message:** `[v52] feat(dust-dash): bigger hall, deliveries at fair spots and four power-ups`
**GitHub-Commit:** [`fe27910`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/fe27910)

## Version 51 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Dust Dash: beim Saugen etwas langsamer laufen, weitermachen mit Schritt 3 (Dreck, Saugen, Punkte); Frage, ob die Halle für 4 Minuten nicht zu klein ist
**Änderungen:**
- Lauftempo beim Saugen von 5 auf 4,2 m/s gesenkt (`move.vacuumSpeed`), normales Tempo bleibt 7 m/s
- Dreck aus einem Startwert: 6000 Teile (Staubflusen, Dreckkrümel, Holzspäne), dichter an Wänden, in Ecken, um Hindernisse und unter Werkbänken, dazu 24 zufällige Dreckflecken; beide Browser bauen aus demselben Startwert exakt dieselben Teile (nur Summen und Wurzeln, kein Sinus), jedes Teil ist erreichbar
- Saugen: Teile im Streifen vor der Düse (1,6 m lang, 1,2 m breit) gehören sofort dem Spieler, zählen 1 Punkt und fliegen in einem kleinen Bogen in die Düse, wo sie wegschrumpfen; nicht durch Regale, Kisten, Fässer und Pfosten hindurch, aber unter Werkbänke
- Staubfilm auf dem Boden: wo die Düse war, kommt der warme Holzboden zum Vorschein (nur Optik)
- Eigener Sauger in Ego-Sicht unten rechts in der Spielerfarbe (Düse, Rohr, Schlauch), wippt beim Laufen und zittert leicht beim Saugen (nicht bei „Bewegung reduzieren“); wird über der Halle gezeichnet und steckt nie in einer Wand
- Punkteanhänger hüpft, wenn die Zahl steigt; die Quittung zählt die echten Punkte hoch; jede Runde bekommt einen neuen Startwert (in der `start`-Nachricht)
- Gemessen (Skript): zwei perfekte Test-Sauger leeren die Halle in etwa 2:24, einer allein schafft 5900 von 6000 Teilen in 4 Minuten. Die Halle ist für 4 Minuten also zu klein; Entscheidung (größere Halle oder kürzere Runde) liegt bei den Entwicklern
- Getestet in Chrome: allein (Saugen, Punkte, saubere Spur, Quittung) und als Party mit zwei Tabs (Gast saugt in seiner Kopie, Quittung beim Gast). Nicht getestet: Maus, Safari, echte Party über den Launcher. In der Party saugt jeder noch seine eigene Kopie und sieht nur die eigenen Punkte (kommt mit Schritt 5); der Bot steht noch still
- Entscheidung 44 um Schritt 3 ergänzt, ROADMAP und docs/DUST-DASH.md aktualisiert; Commit-Hash für Version 49 und 50 nachgetragen
**Geänderte Dateien:** games/dust-dash/ (neu: dirt.js, dirtView.js, viewModel.js; geändert: game.js, sim.js, host.js, guest.js, hall.js, hallView.js, hud.js, config.js, index.html), docs/DECISIONS.md, docs/ROADMAP.md, docs/DUST-DASH.md, PROTOKOLL.md
**Commit-Message:** `[v51] feat(dust-dash): add dirt from a seed, vacuuming, the dust film and points`
**GitHub-Commit:** [`fe27910`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/fe27910)

## Version 50 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Dust Dash Schritt 2 (Halle und Bewegung) und das ganze Interface neu gestalten, weil es zu sehr nach Blind Drop aussah
**Änderungen:**
- Interface komplett neu, als Dinge aus der Werkstatt: Menü ist ein Paketanhänger am linken Rand (die Halle bleibt daneben sichtbar), Farben sind kleine Farbdosen, die Spieler stehen wie auf einem Formular, die Uhr ist ein Holzschild an zwei Schnüren mit je einem Papieranhänger für die Punkte, Hinweise sind Papierstreifen, das Ergebnis ist eine Quittung mit Stempel („You win!“, „You lose“, „Draw“); Schreibmaschinen- und Schablonenschrift aus den Systemschriften
- Halle 40 × 26 m im Comic-Stil (Toon-Schattierung, dicke braune Umrisse): Dielenboden, Bretterwände, Fenster, Scheunentore, Dachbalken, Regale mit Kartons und Farbdosen, Werkbänke mit Werkzeug, Kistenstapel, Fässer, Pfosten; eine Hälfte von Hand gebaut, die andere punktgespiegelt (fair für beide Startpunkte)
- Bewegung in Ego-Perspektive: WASD, Maus (Pointer Lock) oder Pfeiltasten zum Umsehen, Kollision mit Wänden und Hindernissen (man gleitet daran entlang), 7 m/s normal und 5 m/s bei gehaltener Saugtaste (linke Maustaste oder E), im Countdown nur Umsehen; leichtes Wippen der Kamera (nicht bei „Bewegung reduzieren“)
- Hinter dem Menü schwenkt die Kamera langsam durch die Halle; Fadenkreuz-Punkt und Hinweis „Click the game to look around with the mouse“
- Getestet: Skript (Tempo 7 und 5 m/s, 200.000 Zufallsschritte ohne einmal in einem Hindernis zu stehen, jede freie Stelle von beiden Startpunkten erreichbar) und in Chrome allein (Menü, Countdown, Laufen bis an die Werkbank und an ein Regal, Drehen mit Pfeiltasten, Quittung) sowie als Party mit zwei Tabs (neues Menü mit gesperrter Farbe, Ready, Start, Gast läuft). Nicht getestet: Maussteuerung mit Pointer Lock (geht in meinem Test-Browser nicht), Safari, echte Party über den Launcher. In der Party läuft jeder noch nur in seinem eigenen Bild der Halle (Positionen kommen in Schritt 5)
- Entscheidung 44 um Schritt 2 ergänzt, ROADMAP und Status in docs/DUST-DASH.md aktualisiert
**Geänderte Dateien:** games/dust-dash/ (neu: hall.js, sim.js, look.js, hallView.js, controls.js; geändert: index.html, game.js, config.js, lobby.js, hud.js, scene.js), docs/DECISIONS.md, docs/ROADMAP.md, docs/DUST-DASH.md, PROTOKOLL.md
**Commit-Message:** `[v50] feat(dust-dash): add the hall, first person movement and an interface of its own`
**GitHub-Commit:** [`a912f97`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/a912f97)

## Version 49 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Dust Dash nach docs/DUST-DASH.md bauen, Schritt 1: Ordner, game.json (Entwurf), Menü und Party-Verbindung von Inkwars übernehmen, Spiel startet allein und mit zwei Tabs
**Änderungen:**
- Neuer Ordner `games/dust-dash/` mit Store-Eintrag als Entwurf (`"status": "draft"`, `"maxPlayers": 2`, Version 0.1.0, noch ohne Cover)
- Menü wie bei Inkwars im warmen Holz-Look: acht Farben (vergebene Farbe ausgegraut, Host hat Vorrang), allein „Start“ gegen den Bot, in der Party „Ready“ (Gast) und „Start match“ (Host), Steuerung unter den Buttons
- Party-Verbindung (PeerJS, `net.js`, `ticker.js`) und `vendor/` von Inkwars übernommen; Host ist Schiedsrichter (`host.js`, Nachrichtenliste oben), Gast zeigt dessen Stand (`guest.js`)
- Leere Runde als Grundgerüst: Countdown 3-2-1, „GO!“, Uhr 4:00, beide Punktestände (noch immer 0), Ergebniskarte, „Again“ nur beim Host
- Getestet in Chrome: allein gegen den Bot (Menü, Farbwahl, Countdown, Uhr, Ergebnis) und als Party mit zwei Tabs (Farben, Ready, Start, gleiche Uhr auf beiden Seiten auch bei verstecktem Host-Tab, Neuladen des Gasts mitten in der Runde, Ergebnis, zurück ins Menü). Für den Test lief die Runde kurz mit 12 statt 240 Sekunden. Nicht getestet: Safari, echte Party über den Launcher mit zwei Konten
- Noch nicht gebaut: Halle, Bewegung, Dreck, Lieferungen, Bot (Schritte 2 bis 8)
- Entscheidung 44 angelegt (offene Punkte aus dem Plan), ROADMAP, games/README.md und Status in docs/DUST-DASH.md aktualisiert; Commit-Hash für Version 48 nachgetragen
**Geänderte Dateien:** games/dust-dash/ (neu: index.html, game.js, config.js, lobby.js, hud.js, host.js, guest.js, scene.js, net.js, ticker.js, game.json, description.md, vendor/), docs/DECISIONS.md, docs/ROADMAP.md, docs/DUST-DASH.md, games/README.md, PROTOKOLL.md
**Commit-Message:** `[v49] feat(dust-dash): add draft store entry, menu and party connection`
**GitHub-Commit:** [`a912f97`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/a912f97)

## Version 48 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Neues Spiel planen (nur Idee und Startprompt für einen neuen Chat): gemütliches Aufräum-Spiel als Partyspiel
**Änderungen:**
- Idee gemeinsam entwickelt: „Dust Dash“, Ego-Perspektive in einer gemütlichen alten Holzhalle im Comic-Stil; zwei Spieler saugen um die Wette Staub, Dreck und Sägespäne (jedes Teil 1 Punkt, kein Beutel zum Leeren), 4 Minuten pro Runde
- Lieferkiste etwa alle 35 Sekunden an einer fairen Zufallsstelle, Symbol auch durch Wände sichtbar; wer zuerst da ist, bekommt 10 Sekunden lang ein zufälliges Upgrade (breitere Düse, Turbo-Schuhe, stärkerer Sog, goldene Düse = doppelte Punkte), nicht stapelbar
- Wer gerade nicht saugt, läuft schneller (Abwägung: Punkte oder Lieferung)
- Party genau 2 Spieler, allein gegen 1 Bot; man kann sich nicht stören, nur gegenseitig den Dreck wegsaugen; keine Draufsicht am Ende
- Kompletter Bauplan in `docs/DUST-DASH.md` (Regeln, Menü, Steuerung, Halle, Bot, Aussehen, Netzwerk wie Inkwars, Dateien, Reihenfolge, Testen); ROADMAP ergänzt; Commit-Hash für Version 47 nachgetragen
- Ohne Sound geplant (wie die anderen Spiele; Sounds kommen später für alle Spiele zusammen)
- Noch kein Code
**Geänderte Dateien:** docs/DUST-DASH.md (neu), docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v48] docs: plan the game Dust Dash`
**GitHub-Commit:** [`8f924c1`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/8f924c1)

## Version 47 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Inkwars: Schuss wie eine echte Wasserpistole (Vorbild: bekannte Tinten-Shooter), Farbe nur, wo das Wasser landet, vor sich spritzen und direkt hineinschwimmen; Tempo der Schüsse bleibt
**Änderungen:**
- Fallende Tröpfchen und die Spur in Blickrichtung komplett entfernt (das war die Ursache für das „Streuen“ nach oben und unten)
- Farbe nur noch am Aufprall: länglicher Klecks in Flugrichtung, je flacher der Einschlag, desto länger, etwas nach hinten gezogen
- Wasser dicht über dem Boden (höchstens 0,6 m) färbt direkt darunter
- Tropfen sehen aus wie ein Wasserstrahl (in Flugrichtung gestreckt)
- Aufgeräumt: `lookYaw`, Landepunkt-Vorausberechnung und `sim.drips` entfernt; Tempo, Zielen, Streuung, Gast-Vorhersage und Treffer mit Rückblick unverändert
- Getestet: Skripte (Farbmuster je Zielweite und für hohe Schüsse, Treffer, Zielen, Host/Gast-Farbfläche gleich, Rückblick 100 %), im Browser allein gegen Bot (Schuss nach oben und geradeaus, vor sich spritzen und sofort als Fisch in der eigenen Farbe). Nicht getestet: Party im Browser, Safari
- Spielversion 1.3.0 mit Patch Note, Beschreibung angepasst, Entscheidung 43, ROADMAP; Commit-Hash für Version 46 nachgetragen
**Geänderte Dateien:** games/inkwars/ (config.js, sim.js, paint.js, effects.js, game.js, guest.js, host.js, wire.js, game.json, description.md), news/2026-11-16-inkwars-1-3.md (neu), docs/DECISIONS.md, docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v47] feat(inkwars): clean water jet that paints only where it lands`
**GitHub-Commit:** [`52ae7ff`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/52ae7ff)

## Version 46 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Inkwars: Die Farbspur wächst am Boden, obwohl dort keine Tropfen landen, und bei hohen Schüssen hat sie eine Lücke; Farbe soll nur dort entstehen, wo Wasser ankommt, Hinterherschwimmen soll bleiben
**Änderungen:**
- Ursache gefunden und gemessen: Die Spur wurde direkt unter dem fliegenden Tropfen auf den Boden gemalt (egal wie hoch er war) und gar nicht mehr, wenn er höher als 5 m war; bei einem leicht nach oben gezielten Schuss z. B. 9 m Spur, 18 m Lücke, dann der Aufprall
- Neu: Der Strahl verliert sichtbare kleine Tropfen, die herunterfallen und erst beim Aufkommen färben; die Linie von den Füßen bis zum Aufprall ist bei jedem Winkel lückenlos
- Tropfen im ersten Meter (unter der eigenen Figur) landen sofort, damit der Fisch direkt losschwimmen kann
- Beim Gast fallen dieselben Tropfen; er nutzt seine eigenen weiter nur als vorläufige Farbe zum Schwimmen, alles Gemalte kommt vom Host
- Getestet: Skripte (Lücken bei allen Winkeln, Treffer, Host/Gast-Farbfläche gleich) und im Browser allein gegen Bot: Hinterherschwimmen nach unten, geradeaus und nach oben ohne einen Moment auf trockenem Boden. Nicht getestet: Party im Browser, Safari
- Spielversion 1.2.1 mit Patch Note, Entscheidung 42, ROADMAP; Commit-Hash für Version 45 nachgetragen
**Geänderte Dateien:** games/inkwars/ (config.js, sim.js, effects.js, game.js, guest.js, host.js, game.json), news/2026-11-16-inkwars-1-2-1.md (neu), docs/DECISIONS.md, docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v46] fix(inkwars): paint the trail only where falling drips land`
**GitHub-Commit:** [`e3d5571`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/e3d5571)

## Version 45 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Inkwars: Spur um die Hälfte breiter, Schüsse schneller, deutlich sichtbare Animation, wenn ein Gegner „stirbt“
**Änderungen:**
- Spur 1,5-mal so breit (Radius 0,45 m statt 0,3 m), weiterhin lückenlos
- Tropfen fliegen schneller (30 statt 22 m/s); sie fallen stärker, damit die Reichweite (~28 m) gleich bleibt
- Neue Animation beim Ausscheiden: Figur schwillt in der Farbe des Gegners an, platzt mit Spritzer, Ring und vielen Tropfen, die Mütze fliegt weg und bleibt bis zum Wiedereinstieg liegen, „SOAKED!“ steigt auf; wer getroffen hat, sieht „Opponent soaked!“
- Läuft bei Host und Gast gleich; bei „Bewegung reduzieren“ ohne Wackeln und Drehen
- Getestet: Zielen, Treffer- und Flächen-Skripte, im Browser allein gegen Bot (Animation, breitere Spur). Nicht getestet: Party-Ansicht der Animation beim Gast, Safari
- Spielversion 1.2.0 mit Patch Note, Entscheidung 41, ROADMAP; Commit-Hash für Version 44 nachgetragen
**Geänderte Dateien:** games/inkwars/ (config.js, actorView.js, game.js, hud.js, index.html, game.json), news/2026-11-16-inkwars-1-2.md (neu), docs/DECISIONS.md, docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v45] feat(inkwars): faster drops, wider trail and a visible knockout`
**GitHub-Commit:** [`2115428`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/2115428)

## Version 44 – 2026-11-16 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Inkwars verbessern: Bewegung ohne Rutschen, Gast bewegt sich ohne Verzögerung, genauere Schüsse, lückenlose Spur zum Hinterherschwimmen (danach: Spur breiter), Treffer prüfen, Treffer trotz Netzwerkverzögerung
**Änderungen:**
- Bewegung direkter: zu Fuß Stopp in 0,08 s statt 0,28 s, Fisch im eigenen Wasser gleitet 2 m statt 11 m nach, Fischsprung rutscht auf trockenem Boden nicht mehr 8 m weiter, mehr Steuerung in der Luft
- Gast in der Party rechnet die eigene Figur selbst (gleiche Regeln, gleiche Farbfläche); der Host spielt jeden Tasten-Schritt des Gasts genau einmal ab (neu: `feed.js`) und meldet zurück, der Gast gleicht Abweichungen sanft aus; eigene frische Kleckse zählen beim Gast kurz als „vorläufige Farbe“, damit er sofort hinterherschwimmen kann
- Treffer mit Rückblick: Der Host prüft Schüsse des Gasts gegen die Position, die der Gast gesehen hat (höchstens 350 ms zurück)
- Fehler behoben: Jeder Schuss landete 0,6 m links vom Fadenkreuz, weite Schüsse fielen bis 12 m zu kurz; jetzt auf wenige Zentimeter genau, auch nah vor Wänden
- Streuung 0,035 → 0,012
- Lückenlose Spur ab den eigenen Füßen in Blickrichtung (Radius 0,3 m, alle 0,3 m ein Tropfen), Tropfen werden platzsparend als Zentimeter-Schritte verschickt
- Testskripte (nicht im Repo): Treffer (Kapsel, Kugel, schnelle Tropfen, Kanten, Wände, untergetaucht, Unverwundbarkeit, Rückblick), Zielen, Fläche/Datenmenge, Party mit künstlicher Verzögerung
- Getestet in Chrome (Browser-Fenster der App): allein gegen Bot, Party mit zwei Tabs (Gast-Bewegung, Hinterherschwimmen, Treffer des Gasts, Neuladen des Gasts). Nicht getestet: Safari, echte Party über das Internet mit zwei Konten, Maus im Launcher
- Spielversion 1.1.0 mit Patch Note, Beschreibung ergänzt, Entscheidung 40, ROADMAP, PARTY-GAMES; Commit-Hash für Version 43 nachgetragen
**Geänderte Dateien:** games/inkwars/ (neu: feed.js; geändert: config.js, sim.js, paint.js, arena.js, camera.js, game.js, host.js, guest.js, wire.js, game.json, description.md), news/2026-11-16-inkwars-1-1.md (neu), docs/DECISIONS.md, docs/ROADMAP.md, docs/PARTY-GAMES.md, PROTOKOLL.md
**Commit-Message:** `[v44] feat(inkwars): direct movement, guest prediction, lag-compensated hits and a gap-free trail`
**GitHub-Commit:** [`2ad79c0`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/2ad79c0)

## Version 43 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Neues Spiel aus inkwars.zip prüfen und als viertes Spiel einbauen: direkt mit Party-Modus 1 gegen 1 und allein gegen Bots spielbar
**Änderungen:**
- ZIP geprüft, ohne etwas daraus auszuführen: Vite/TypeScript-Projekt des zweiten Entwicklers mit three.js, keine Netzwerkzugriffe, keine Werbung, kein Tracking; `node_modules` und Build-Dateien der ZIP wurden nicht übernommen
- Neues Spiel `games/inkwars/` (Inkwars 1.0.0, zuerst als Entwurf): 3D-Wasserschlacht, zwei Seiten färben die Arena, nach 3 Minuten gewinnt die größere Fläche; Fischform (Shift) macht im eigenen Wasser schnell und unsichtbar
- TypeScript in normales JavaScript ohne Build-Schritt umgewandelt, eine kleine Datei pro Aufgabe wie bei Blind Drop; alle Kommentare und Spieltexte ins Englische übersetzt
- three.js 0.187 und PeerJS liegen in `vendor/` (dieselben Dateien wie in den anderen Spielen, statt der mitgelieferten Version 0.170); die Test-Hintertür `window.__inkwars` ist entfernt
- Party-Modus 1 gegen 1 neu gebaut: Der Host ist der Schiedsrichter (`host.js`), der Gast schickt Tasten und Zielrichtung und zeigt den gemeldeten Stand (`guest.js`, `wire.js`); jeder Farbklecks wird beim Gast genau wiederholt, dadurch sehen beide dieselbe Arena und denselben Punktestand
- Menü für die Party: Farbwahl für beide (vergebene Farbe ist ausgegraut), „Ready“ beim Gast, „Start match“ beim Host; nach dem Spiel bringt der Host beide zurück ins Menü
- Lädt der Gast während des Spiels neu, steigt er mit der kompletten Farbfläche wieder ein; verlässt der Host das Spiel, wartet der Gast im Menü
- Allein gestartet: gegen Bots, 1 v 1 oder 2 v 2 (wie in der ZIP)
- Store-Eintrag (`game.json` mit `"status": "draft"`, `maxPlayers` 2), Beschreibung, Cover und Banner als SVG, Patch Note
- Doku: ROADMAP (Stand, Ideen, offene Punkte), neue Entscheidung 39, games/README, PARTY-GAMES (viertes Beispiel)
- Getestet in Chrome: allein gegen einen Bot, Party mit zwei Tabs (Menü, Farben, gleiche Fläche und gleicher Punktestand auf beiden Bildschirmen, Neuladen des Gasts im Spiel, Ergebnis, Rematch), Anzeige im Launcher und Start im Player. Nicht getestet: Safari, echte Party mit zwei Konten, Maussteuerung im Launcher, Treffer zwischen zwei Menschen, Host-Tab im Hintergrund
- `inkwars.zip` gehört nicht ins Repo und kann gelöscht werden
**Geänderte Dateien:** games/inkwars/ (neu: index.html, game.js, config.js, arena.js, paint.js, sim.js, nav.js, bots.js, host.js, guest.js, wire.js, net.js, ticker.js, scene.js, arenaView.js, actorView.js, effects.js, camera.js, controls.js, lobby.js, hud.js, game.json, description.md, cover.svg, banner.svg, vendor/), news/2026-11-15-inkwars-1-0.md (neu), docs/ROADMAP.md, docs/DECISIONS.md, docs/PARTY-GAMES.md, games/README.md, PROTOKOLL.md
**Commit-Message:** `[v43] feat(games): add Inkwars, a 3D water fight for two players or against bots`
**GitHub-Commit:** [`0aed2b8`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/0aed2b8)

## Version 42 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Blind Drop genau prüfen, Fehler beheben, Code so sauber wie möglich aufteilen, alles für den nächsten Chat dokumentieren
**Änderungen:**
- Fehler behoben: Ein Gast, der seinen Tab neu lädt, konnte dauerhaft „This match is already full.“ sehen, weil der Host die alte Verbindung noch nicht als beendet erkannt hatte; der Gast fragt jetzt einige Sekunden lang erneut an
- Fehler behoben: Lief das Spiel in einem Tab im Hintergrund, stauten sich Bomben und Explosionen und liefen beim Zurückkommen alle auf einmal ab; neue Effekte werden jetzt übersprungen, solange nichts gezeichnet wird
- Fehler behoben: Nach dem Verschieben des Fensters auf einen anderen Monitor konnte das Bild unscharf werden; die Pixeldichte wird jetzt bei jeder Größenänderung neu gesetzt
- Fehler behoben: Die Knöpfe im Menü wurden bei jeder Nachricht neu erzeugt und verloren den Tastaturfokus; sie werden jetzt einmal gebaut und nur aktualisiert
- Fehler behoben: Bei jeder neuen Verbindung des Gastes wurde ein weiterer „Tab schließt“-Horcher angelegt; jetzt gibt es genau einen
- Der Bot zielt bei kleinen Explosionen näher am Spieler (er war noch auf den alten Radius 4 abgestimmt); die Startpositionen richten sich nach der Inselgröße des Modus
- Code aufgeteilt, jede Datei hat eine Aufgabe: `scene.js` (vorher ca. 820 Zeilen) in `scene.js`, `look.js`, `world.js`, `characters.js`, `effects.js`; `game.js` (vorher ca. 470 Zeilen) in `game.js`, `lobby.js`, `hud.js`; Bot in `bot.js`; die Liste aller Nachrichten steht oben in `host.js`
- Spielversion 1.2.1 mit Patch Note; ROADMAP (Stand und Dateiübersicht), Entscheidung 37 korrigiert, neue Entscheidung 38; Commit-Hash für Version 40 und 41 nachgetragen
- Getestet nach dem Umbau: Übungsmodus Classic, zwei Tabs in Chrome in Snipe und Classic (Treffer, Ergebnis, Rematch, Neuladen von Host und Gast), Schiedsrichter-Simulation für alle Größen und Snipe. Nicht getestet: Safari
**Geänderte Dateien:** games/blind-drop/ (neu: bot.js, look.js, world.js, characters.js, effects.js, lobby.js, hud.js; geändert: scene.js, game.js, host.js, net.js, config.js, index.html, game.json), news/2026-11-15-blind-drop-1-2-1.md (neu), docs/DECISIONS.md, docs/ROADMAP.md, games/README.md, PROTOKOLL.md
**Commit-Message:** `[v42] refactor(blind-drop): split code into small files, fix rejoin and background bugs`
**GitHub-Commit:** [`ac16939`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/ac16939)

## Version 41 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Blind Drop: neuer Modus „Snipe“ (Insel fest Radius 8, schrumpft nie, Explosionsradius 1, ohne Rundengrenze, Bombe und BOOM wie bei Classic) mit eigenem düsteren Look
**Änderungen:**
- Neue Zeile „Mode“ im Menü: Classic (wie bisher) oder Snipe; nur der Host wählt, im Übungsmodus man selbst; ändert der Host den Modus, muss der Gast wieder „Ready“ drücken
- Snipe-Regeln: Explosionsradius fest 1, Insel fest Radius 8, kein Schrumpfen und keine Rundengrenze; nach einer Runde ohne Treffer steht „MISSED!“ und die nächste Runde beginnt; die Auswahl „Blast size“ ist in Snipe ausgeblendet
- Snipe-Look: Nachthimmel mit blassem Mond statt der Planeten, dunkle Steinplatte mit aufgemalten Ringen und Fadenkreuz wie im Zielfernrohr, Fadenkreuz beim Zielen, dunkle Anzeige mit roter Akzentfarbe; die Figuren behalten ihre kräftigen Farben
- Der Look wechselt schon im Menü, sobald der Host den Modus wählt
- Der Bot zielt in Snipe näher am Spieler
- Das „BOOM!“ ist bei kleinen Explosionen kleiner (gilt auch für Classic), damit man den Einschlag sieht
- Spielversion 1.2.0 mit Patch Note; Beschreibung, ROADMAP und Entscheidung 37 ergänzt
- Getestet: Übungsmodus in Snipe und Classic, zwei Tabs in Chrome (Gast kann den Modus nicht ändern, Look wechselt bei beiden, Runde 2 ohne Schrumpfen), Schiedsrichter-Simulation für alle Größen und Snipe. Nicht getestet: Safari und zwei echte Konten
**Geänderte Dateien:** games/blind-drop/ (config.js, host.js, scene.js, game.js, index.html, game.json, description.md), news/2026-11-15-blind-drop-1-2.md (neu), docs/DECISIONS.md, docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v41] feat(blind-drop): add Snipe mode with its own dark look`
**GitHub-Commit:** [`c05e4c8`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/c05e4c8)

## Version 40 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Blind Drop: Bombengrößen auf Large 3, Medium 2, Small 1 ändern (nur das und die dazugehörige Inselverkleinerung); Rückmeldung zu einem neuen Modus „Snipe“
**Änderungen:**
- Bombenradius: Small 1 (vorher 1,8), Medium 2 (vorher 2,7), Large 3 (vorher 4); Medium bleibt Standard
- Die kleinste Insel richtet sich wie bisher nach der Größe (85 %): jetzt 0,85 / 1,7 / 2,55
- Spielversion 1.1.2 mit Patch Note; Entscheidung 36 und ROADMAP angepasst; Commit-Hash für Version 39 nachgetragen
- Mit der Simulation geprüft, dass jede Größe sauber schrumpft und eine Partie endet
- Der Modus „Snipe“ ist noch nicht gebaut, dazu gab es nur Rückmeldung und Fragen
**Geänderte Dateien:** games/blind-drop/config.js, games/blind-drop/game.json, news/2026-11-15-blind-drop-1-1-2.md (neu), docs/DECISIONS.md, docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v40] fix(blind-drop): set blast sizes to 1, 2 and 3`
**GitHub-Commit:** [`c05e4c8`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/c05e4c8)

## Version 39 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Auf den neuesten Stand bringen; danach die Blind-Drop-Version in der ROADMAP anpassen
**Änderungen:**
- ROADMAP: Blind Drop steht jetzt auf Version 1.1.1, mit dem Hinweis, dass Small und Medium in 1.1.1 kleiner wurden
- Commit-Hash für Version 38 nachgetragen
**Geänderte Dateien:** docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v39] docs(roadmap): update Blind Drop to version 1.1.1`
**GitHub-Commit:** [`5e72aa0`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/5e72aa0)

## Version 38 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Blind Drop: Bombengrößen anpassen, Large bleibt, Medium wird 2,7 und Small 1,8
**Änderungen:**
- Radius „Small“ von 2,5 auf 1,8 und „Medium“ von 3,2 auf 2,7 verkleinert; „Large“ bleibt 4, Medium bleibt Standard
- Die kleinste Insel richtet sich wie bisher nach der Größe (85 %): jetzt 1,5 / 2,3 / 3,4
- Spielversion 1.1.1 mit Patch Note; Entscheidung 36 angepasst
- Mit der Simulation geprüft, dass jede Größe sauber schrumpft und eine Partie endet
**Geänderte Dateien:** games/blind-drop/config.js, games/blind-drop/game.json, news/2026-11-15-blind-drop-1-1-1.md (neu), docs/DECISIONS.md, PROTOKOLL.md
**Commit-Message:** `[v38] fix(blind-drop): make small and medium blasts smaller`
**GitHub-Commit:** [`4359793`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/4359793)

## Version 37 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Blind Drop: Der Host soll vor der Partie den Bombenradius wählen können (klein, mittel, groß; der bisherige ist groß)
**Änderungen:**
- Neue Zeile „Blast size“ im Menü unter der Farbwahl: Small (Radius 2,5), Medium (3,2, Standard) und Large (4, wie bisher)
- Nur der Host kann wählen; der Gast sieht die Wahl mit dem Hinweis „The host picks the blast size.“; im Übungsmodus wählt man selbst
- Ändert der Host die Größe, muss der Gast wieder „Ready“ drücken
- Die Insel schrumpft jetzt bis auf 85 % des gewählten Radius (2,1 / 2,7 / 3,4), damit eine Partie weiterhin sicher endet
- Zielkreis, Bodenmarkierung, Explosion und Bot passen sich der gewählten Größe an
- Spielversion 1.1.0 mit Patch Note; Beschreibung, ROADMAP und Entscheidung 36 ergänzt; Commit-Hash für Version 36 nachgetragen
- Getestet: Übungsmodus mit „Small“ und zwei Tabs in Chrome (Gast kann nicht wählen, Gast-„Ready“ wird zurückgesetzt); Schrumpfen pro Größe mit einer Simulation geprüft
**Geänderte Dateien:** games/blind-drop/ (config.js, host.js, scene.js, game.js, index.html, game.json, description.md), news/2026-11-15-blind-drop-1-1.md (neu), docs/DECISIONS.md, docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v37] feat(blind-drop): let the host choose the blast size`
**GitHub-Commit:** [`c88dc3b`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/c88dc3b)

## Version 36 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Warnung „Node.js 20 is deprecated“ in GitHub Actions beheben
**Änderungen:**
- Automatische Prüfung (`ci.yml`): `actions/checkout` und `actions/setup-node` von Version 4 auf Version 5 angehoben; diese laufen selbst mit Node 24, die Warnung verschwindet damit
- An der Prüfung selbst ändert sich nichts: weiterhin `npm ci`, lint, Formatprüfung, typecheck, build mit der Node-Version aus `.nvmrc`
- Nicht lokal testbar: Ob der Lauf grün bleibt, zeigt sich erst nach dem Push unter „Actions“ auf GitHub
- Commit-Hash für Version 35 nachgetragen
**Geänderte Dateien:** .github/workflows/ci.yml, PROTOKOLL.md
**Commit-Message:** `[v36] ci: update checkout and setup-node actions to v5`
**GitHub-Commit:** [`b45a3ef`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/b45a3ef)

## Version 35 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Treffer und Lebensabzug genau prüfen, den ganzen Code auf Fehler, Ruckler und mögliche Probleme durchsehen und beheben; danach soll Die Together online gehen
**Änderungen:**
- Treffer auf laufende Figuren: Jeder Bildschirm zeigt die anderen etwas verspätet (Netz und Glättung). Ein genau gezielter Schuss auf eine laufende Figur ging deshalb oft daneben. Jetzt schickt der Schuss mit, welchen Moment der Schütze gesehen hat, und der Host prüft gegen die Positionen von damals (höchstens 0,35 Sekunden zurück)
- Verbindung im Menü: Der Host schickt über seinen ungebremsten Takt alle 2 Sekunden ein Lebenszeichen, damit Gäste nicht denken, der Host sei weg, wenn sein Tab im Hintergrund liegt
- Auf dem Siegerbild läuft niemand mehr weiter (auch der Bot nicht)
- 3D-Auflösung auf Retina-Bildschirmen auf das 1,5-fache begrenzt (statt 2-fach), damit ältere Macs nicht ruckeln
- Veröffentlicht: `game.json` auf `"status": "published"` und Version 1.0.0; Patch Note heißt jetzt „Die Together 1.0“ (Datei umbenannt in `2026-11-15-die-together-1-0.md`) und erwähnt Nachlade-Ring und leeres Magazin
- Doku: ROADMAP (veröffentlicht, Teststand), DIE-TOGETHER (Status), Entscheidung 35 (Treffer mit Rückblick, Lebenszeichen), PARTY-GAMES (Treffer trotz Verzögerung)
- Geprüft mit einem Test-Skript (30 Prüfungen, alle bestanden): 5 Treffer = raus, Leben 5→0 ohne Minus, genau ein „out“, Sieger, zurück ins Menü; Unentschieden bei gleichzeitigem letzten Treffer; zwei Schützen im selben Moment = 2 Leben; Schuss über den Kopf daneben, oben am Kopf Treffer; Kiste hält Schuss auf die Füße auf; laufendes Ziel mit Rückblick getroffen (ohne daneben); unsinnige Werte werden ignoriert; Magazin, Nachladen, Leer-Klick nur an das eigene Team; nur der Tastatur-Spieler lädt nach, nur der Maus-Spieler schießt; kein Schießen und Laufen im Countdown; Verlassen = Team raus. Außerdem in Chrome mit 4 Tabs (2 Teams) ohne Fehler; lint, typecheck, build
- Durchgesehen ohne Befund: Verbindung (net.js), Menü und Plätze, Wände und Versinken, Bot, Speicher (Materialien werden freigegeben), Eingaben (Tastatur, Maus-Sperre, Fokus)
- Commit-Hash für Version 34 nachgetragen
**Geänderte Dateien:** games/die-together/host.js, games/die-together/game.js, games/die-together/scene.js, games/die-together/config.js, games/die-together/game.json, news/2026-11-15-die-together-1-0.md (umbenannt aus 2026-11-15-die-together-0-1.md), docs/ROADMAP.md, docs/DIE-TOGETHER.md, docs/DECISIONS.md, docs/PARTY-GAMES.md, PROTOKOLL.md
**Commit-Message:** `[v35] feat(die-together): fair hits on moving targets, stability fixes, publish 1.0.0`
**GitHub-Commit:** [`945e88d`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/945e88d)

## Version 34 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Die Together: Bot etwas schwächer; Ring ums Fadenkreuz beim Nachladen; leeres Magazin unten rechts kurz rot und wackelnd, wenn ohne Munition geklickt wird
**Änderungen:**
- Bot schwächer: dreht sich langsamer, reagiert später (0,7–1,3 statt 0,45–0,95 Sekunden), zögert länger zwischen Schüssen und zielt ungenauer (trifft in der Simulation etwa 4 statt 5 von 10 Schüssen)
- Nachlade-Ring: Fehler behoben, er war seit Version 30 nie zu sehen (ein SVG-Element lässt sich nicht über `.hidden` einblenden). Jetzt sehen ihn beide Spieler der Figur, er ist größer und hat einen dunklen Rand
- Klick mit leerem Magazin: Die Patronen-Anzeige unten rechts wird kurz rot und wackelt, bei beiden Spielern der Figur (so weiß der Tastatur-Spieler, dass er R drücken muss). Bei „Bewegung reduzieren“ im System wackelt sie nicht, wird aber trotzdem rot
- Entscheidung 35 ergänzt; Commit-Hash für Version 33 nachgetragen
- Getestet: Bot-Simulation (7 Runden); in Chrome mit zwei Tabs: 5 Schüsse, Klick mit leerem Magazin (rot bei Maus- und Tastatur-Spieler), R gedrückt (Ring bei beiden, nach 1 Sekunde halb voll, nach 2 Sekunden weg und Magazin voll); lint, typecheck, build
**Geänderte Dateien:** games/die-together/config.js, games/die-together/host.js, games/die-together/game.js, games/die-together/index.html, docs/DECISIONS.md, PROTOKOLL.md
**Commit-Message:** `[v34] fix(die-together): weaker bot, visible reload ring for both players, flash empty magazine`
**GitHub-Commit:** [`2204aa5`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/2204aa5)

## Version 33 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** `npm ci` bricht mit ERESOLVE ab (typescript-eslint passt nicht zu ESLint 10)
**Änderungen:**
- Ursache: `npm audit fix --force` hatte `typescript-eslint` von `^8.72.2` auf `^8.36.0` zurückgestuft; diese Version unterstützt nur ESLint 8/9 und TypeScript unter 5.9
- `typescript-eslint` in `package.json` wieder auf `^8.72.2`, `package-lock.json` auf den Stand des letzten Commits zurückgeholt, Pakete mit `npm ci` neu installiert
- Behalten: der Block `"allowScripts"` (erlaubt dem Mac-Paket `fsevents` sein Installationsskript, von `npm install-scripts approve` angelegt)
- Die 7 Warnungen von `npm audit` betreffen `minimatch` innerhalb des Linters (läuft nur auf dem eigenen Rechner, nicht auf der Webseite); nichts zu tun. `npm audit fix --force` nicht verwenden
- Geprüft: `npm ci`, lint, typecheck, build
- Commit-Hash für Version 31 und 32 nachgetragen
**Geänderte Dateien:** package.json, package-lock.json (unverändert gegenüber dem letzten Commit), PROTOKOLL.md
**Commit-Message:** `[v33] chore: restore typescript-eslint after audit fix, allow fsevents install script`
**GitHub-Commit:** [`df7afe4`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/df7afe4)

## Version 32 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Die Together, Schritt 5: Dokumentation
**Änderungen:**
- ROADMAP: Die Together unter „Where things stand“ als gebaut (noch Entwurf) mit Teststand; Ideen für später (Töne, Sterne, Wackeln, schlauerer Bot, Punktestand, Zuschauen aus den Augen einer Figur); offener Punkt Safari gilt auch für Die Together
- Neue Entscheidung 35: alle Entscheidungen, die der Plan offen ließ (Menü, Maus-Regler, Körper und Sprunghöhe, gespiegelte Map, Versinken der Hindernisse, gemeinsame Wertung der Schüsse, Zuschauen von oben, Bot-Werte, Takt im Web Worker, was noch fehlt)
- PARTY-GAMES: Die Together als drittes Beispiel für viele Spieler; games/README: Zeile in der Tabelle; DIE-TOGETHER.md: Status oben
**Geänderte Dateien:** docs/ROADMAP.md, docs/DECISIONS.md, docs/PARTY-GAMES.md, docs/DIE-TOGETHER.md, games/README.md, PROTOKOLL.md
**Commit-Message:** `[v32] docs: document Die Together`
**GitHub-Commit:** [`a17ce2e`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/a17ce2e)

## Version 31 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Die Together, Schritt 4: Bot, damit man zu zweit gegen ihn spielen kann, und Cover; keine Töne (kommen später)
**Änderungen:**
- Bot (nur bei genau 2 Spielern): läuft zwischen Deckungsplätzen hin und her, sucht ohne Hinweis zuerst die Mitte, dreht sich mit begrenzter Geschwindigkeit zur Spieler-Figur, sobald er sie sieht, wartet eine kurze zufällige Reaktionszeit, zielt etwas daneben (trifft etwa jeden zweiten Schuss), lädt nach, wenn das Magazin leer ist oder gerade Ruhe herrscht, und hält Abstand zu den zusammenrückenden Wänden. Er hat dieselben Regeln wie alle (5 Leben, 5 Schuss, 1 Sekunde, 2 Sekunden Nachladen). Seine Werte stehen in `config.js` (`BOT_…`)
- Konfetti in Teamfarbe, wenn eine Figur raus ist
- Cover und Banner (eigene Comic-Zeichnung: rote Figur mit Maus- und Tastatur-Symbol, „LEFT!“ / „YOUR LEFT?!“, blaue Figur mit Herzen), lange Beschreibung `description.md`, beide Bilder in `game.json` eingetragen; das Spiel bleibt `draft`
- Patch Note „Die Together 0.1“ in `news/`
- Launcher: News-Beiträge zu einem Spiel im Entwurf bleiben auf der echten Seite versteckt, bis das Spiel veröffentlicht ist (sonst wäre die Patch Note schon öffentlich); Entscheidung 23 und ADDING-A-GAME ergänzt
- Keine Töne, wie gewünscht
- Getestet: 7 simulierte Runden gegen den Bot (stillstehende Spieler: der Bot findet sie und gewinnt nach 40–60 Sekunden; genau zielende Spieler gewinnen gegen ihn), dabei nie außerhalb der Wände. In Chrome mit zwei Tabs: Bot läuft, trifft, Herzen über seinem Kopf, Konfetti, Siegerbild. Store-Karte, Spielseite und Patch Note lokal angesehen. lint, typecheck, build. Nicht getestet: das Ausblenden der Patch Note auf der echten Seite (gilt nur im fertigen Build), echte Maus-Sperre, Safari, echte Party
- Commit-Hash für Version 30 nachgetragen
**Geänderte Dateien:** games/die-together/host.js, games/die-together/config.js, games/die-together/scene.js, games/die-together/game.js, games/die-together/game.json, games/die-together/cover.svg (neu), games/die-together/banner.svg (neu), games/die-together/description.md (neu), news/2026-11-15-die-together-0-1.md (neu), src/features/games/api.ts, src/features/news/api.ts, docs/DECISIONS.md, docs/ADDING-A-GAME.md, PROTOKOLL.md
**Commit-Message:** `[v31] feat(die-together): add bot, confetti, cover, banner and patch note`
**GitHub-Commit:** [`a17ce2e`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/a17ce2e)

## Version 30 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Die Together, Schritt 3b: Schießen, Leben, Anzeigen, zusammenrückende Wände und Rundenablauf
**Änderungen:**
- Pistole: Linksklick des Maus-Spielers schießt; 5 Schuss pro Magazin, 1 Sekunde zwischen zwei Schüssen, Nachladen nur mit R durch den Tastatur-Spieler (2 Sekunden, währenddessen kein Schuss, bei vollem Magazin passiert nichts). Leeres Magazin: nichts passiert
- Treffer entscheidet der Host: gerade Linie aus den Augen, unbegrenzte Reichweite, Wände und Hindernisse (auch Rampen) halten den Schuss auf. Sichtbar als kurzes Mündungsfeuer und dünne Linie in Teamfarbe; die getroffene Figur blinkt, bei eigenem Treffer blitzt ein roter Rahmen auf
- Leben: 5 pro Figur, ein Treffer kostet eins. Bei 0 ist die Figur raus („Red team is out!“), ihre zwei Spieler schauen von oben zu. Schüsse im selben Augenblick werden gemeinsam gewertet, deshalb ist ein Unentschieden möglich
- Anzeigen: unten links 5 Herzen, unten rechts 5 Patronen (verbrauchte grau), Herzen über den Köpfen der Gegner (nur wenn der Gegner zu sehen ist), Ring um das Fadenkreuz beim Nachladen (nur für den Maus-Spieler)
- Wände: 20 Sekunden Ruhe, dann rücken alle vier Außenwände zusammen, bis nach 90 Sekunden ein Feld von 6 × 6 übrig ist. Die Wand schiebt Figuren nach innen (kostet kein Leben); Hindernisse versinken im Boden, bevor die Wand sie erreicht
- Rundenablauf: „3, 2, 1, Go!“ (dabei kann niemand laufen oder schießen), Kampf, Siegerbild für 4 Sekunden („Red team wins!“ mit beiden Namen, oder „Draw!“), zurück ins Menü. Verlässt ein Spieler die Runde, ist seine Figur raus
- Der vorläufige Knopf „Back to menu“ ist wieder weg; die eigene Pistole im Bild ist kleiner
- Der Bot steht weiterhin nur da (er kann getroffen werden); sein Verhalten, Konfetti, Sterne und Töne kommen in Schritt 4
- Getestet: alle Regeln des Schiedsrichters mit einem Skript (Countdown sperrt, Abklingzeit, leeres Magazin, Nachladen, Schuss endet an Mauer, 5 Treffer, raus, Sieger, zurück ins Menü, Wände nach 19/55/95 Sekunden und das Schieben der Figuren). In Chrome mit zwei Tabs: Countdown, Schuss und Patronen-Anzeige, Nachlade-Ring nur beim Maus-Spieler, Ausscheiden durch Verlassen, Siegerbild, Rückkehr ins Menü. Nicht im Browser getestet: ein Treffer auf eine gegnerische Figur (Blinken, roter Rahmen, Herzen über dem Kopf aus der Ich-Sicht), echte Maus-Sperre, Safari, echte Party
- Commit-Hash für Version 29 nachgetragen
**Geänderte Dateien:** games/die-together/host.js, games/die-together/game.js, games/die-together/scene.js, games/die-together/config.js, games/die-together/index.html, PROTOKOLL.md
**Commit-Message:** `[v30] feat(die-together): add shooting, lives, HUD, closing walls and round flow`
**GitHub-Commit:** [`d3ffb03`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/d3ffb03)

## Version 29 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Die Together ist im Launcher nirgends zu sehen
**Änderungen:**
- Store-Eintrag `game.json` für Die Together vorgezogen (war für Schritt 4 geplant): Titel, Kurzbeschreibung, 2–8 Spieler in gerader Zahl, Version 0.1.0, Status `draft`. Das Spiel erscheint damit lokal (`npm run dev`) im Store, auf der echten Seite noch nicht
- Cover, Banner und lange Beschreibung fehlen noch (kommen in Schritt 4); bis dahin zeigt der Store das graue Platzhalterbild
- Commit-Hash für Version 28 nachgetragen
**Geänderte Dateien:** games/die-together/game.json (neu), PROTOKOLL.md
**Commit-Message:** `[v29] feat(die-together): add draft store entry`
**GitHub-Commit:** [`264649b`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/264649b)

## Version 28 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Die Together, Schritt 3a: Arena, Bewegung nach Rolle, Kamera und Abgleich übers Netz
**Änderungen:**
- Arena in 3D (30 × 30): karierter Boden, vier Außenwände, 33 Hindernisse (Kisten in zwei Höhen, Mauerstücke, Säulen, zwei niedrige Plattformen mit Rampe); jede Ecke hat dieselbe Deckung. Die Map steht einmal als Daten in `config.js`
- Der Schiedsrichter (Host) bewegt jede Figur aus den Eingaben ihrer zwei Spieler: Laufen relativ zur Blickrichtung, Springen, Schwerkraft, Kollision mit Wänden und Hindernissen, Rampen hochlaufen, auf niedrige Kisten springen. Er schickt den Stand 20-mal pro Sekunde
- Maus-Spieler: dreht die Sicht sofort lokal (Zeiger wird nach einem Klick gesperrt, Hinweis „Click to aim“). Tastatur-Spieler: WASD und Leertaste (Hinweis „Click to take the keyboard“, solange das Spiel keine Tasten bekommt). Beide sehen durch die Augen ihrer Figur
- Comic-Figuren mit großen Augen und Pistole in Teamfarbe; die eigene Pistole ist im Bild zu sehen. Anzeige „You are: Mouse/Keyboard“ in Teamfarbe, Fadenkreuz
- Regler „Mouse speed“ im Menü, wird im Browser gemerkt
- Verlässt ein Spieler die Runde, ist seine Figur raus und der Partner schaut von oben zu; wer mitten in der Runde dazukommt, schaut ebenfalls zu
- Vorläufig: Die Runde hat noch kein Ende. Der Host hat oben einen Knopf „Back to menu“; der Bot steht nur da. Schießen, Leben, Wände und Rundenablauf kommen in Schritt 3b
- Getestet: Bewegung und Kollision des Schiedsrichters mit einem Skript (Wand, Rampe, Plattform, Kiste, Sprung); in Chrome mit zwei Tabs Start, gleiche Sicht bei beiden, Drehen und Laufen kommen beim anderen an, Verlassen, zurück ins Menü. Nicht getestet: die echte Maus-Sperre (im Test-Browser nicht möglich, Mausbewegung wurde nachgestellt), Safari, echte Party
- Commit-Hash für Version 26 und 27 nachgetragen
**Geänderte Dateien:** games/die-together/scene.js (neu), games/die-together/config.js, games/die-together/host.js, games/die-together/game.js, games/die-together/index.html, PROTOKOLL.md
**Commit-Message:** `[v28] feat(die-together): add arena, movement by role and first person view`
**GitHub-Commit:** [`afbfb09`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/afbfb09)

## Version 27 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Die Together, Schritt 2: Menü und Verbindung (Plätze, Start-Regeln, Hinweis beim Alleinstart)
**Änderungen:**
- Neuer Spielordner `games/die-together/` (noch ohne Store-Eintrag, nur über die direkte Adresse erreichbar); three.js und PeerJS mit Lizenzdateien aus Blind Drop übernommen
- Menü mit 4 farbigen Team-Karten und je einem Maus- und einem Tastatur-Platz; Klick auf einen freien Platz setzt einen dorthin, Klick auf den eigenen Platz steht wieder auf
- Liste der verbundenen Spieler, wer noch lädt steht als „joining…“ da
- Nur der Host hat „Start“; darunter steht, was fehlt („Waiting for 1 more player…“, „Waiting for ben to pick a seat…“, „Every team needs a mouse and a keyboard player.“)
- Bei genau 2 Leuten sitzt ein Bot auf einem freien Team; setzt sich jemand dorthin, weicht er aus
- Allein gestartet zeigt das Spiel nur den Hinweis, dass es eine Party braucht
- Verbindung wie in Blind Drop (Host als Schiedsrichter); verlässt der Host das Spiel, sehen die anderen „The host left the game.“
- Der Takt des Schiedsrichters läuft über einen kleinen Web Worker (`ticker.js`), damit er auch in einem versteckten Tab nicht gebremst wird
- Vorläufig: „Start“ zeigt 4 Sekunden lang die Aufstellung und geht dann zurück ins Menü; die Arena kommt in Schritt 3
- Getestet in Chrome mit 2, 4 und 8 Tabs: Verbinden, Plätze, alle Start-Hinweise, Start, Rückkehr ins Menü, Tab schließen, Host geht weg, Bot bei 2 Spielern. Nicht getestet: Safari, echte Party über den Launcher
**Geänderte Dateien:** games/die-together/index.html (neu), games/die-together/game.js (neu), games/die-together/host.js (neu), games/die-together/net.js (neu), games/die-together/config.js (neu), games/die-together/ticker.js (neu), games/die-together/vendor/ (neu, 5 Dateien), PROTOKOLL.md
**Commit-Message:** `[v27] feat(die-together): add menu with seats and party connection`
**GitHub-Commit:** [`fe2401d`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/fe2401d)

## Version 26 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Die Together, Schritt 1: Der Launcher lernt, dass ein Spiel mindestens 2 Spieler und eine gerade Spielerzahl brauchen kann
**Änderungen:**
- `game.json` kennt zwei neue freiwillige Felder: `minPlayers` (Standard 1) und `evenPlayers` (Standard false). Ist `minPlayers` größer als `maxPlayers`, zeigt der Store eine Fehlermeldung mit Datei und Zahlen
- Store-Karte zeigt die Spielerzahl aus beiden Werten („2–8“ statt „1–8“); Spielseite zeigt unter „Players“ z. B. „2–8, even number, party only“
- Play-Knopf auf der Spielseite: Ohne Party (oder allein in der Party) ist er bei solchen Spielen grau mit „Needs a party of 2, 4, 6 or 8 players.“; für den Host grau bei zu kleiner Party („Needs at least …“) und bei ungerader Zahl („Needs an even number of players. Your party has 3.“). Die Liste „2, 4, 6 or 8“ wird ausgerechnet
- Die Regeln zur Spielerzahl liegen in einer neuen kleinen Datei `players.ts`; neuer Leser `readBoolean` für Ja/Nein-Felder in Inhaltsdateien
- Doku: beide Felder in ADDING-A-GAME und PARTY-GAMES beschrieben; Commit-Hash für Version 25 nachgetragen
- Geprüft: lint, typecheck, build; im Browser als Gast mit einem vorübergehenden Test-Eintrag (danach wieder gelöscht): Karte „2–8“, grauer Knopf mit Hinweis, Fehlermeldung bei `minPlayers` 9; Blind Drop und WPM Trainer unverändert („1–2“, normaler Play-Knopf). Nicht getestet (braucht Konten): die Hinweise für den Host in einer echten Party
**Geänderte Dateien:** src/features/games/players.ts (neu), src/features/games/api.ts, src/features/games/GameCard.tsx, src/features/party/GamePlayActions.tsx, src/pages/GamePage.tsx, src/lib/content.ts, src/types/models.ts, docs/ADDING-A-GAME.md, docs/PARTY-GAMES.md, PROTOKOLL.md
**Commit-Message:** `[v26] feat(games): add minPlayers and evenPlayers for party-only games`
**GitHub-Commit:** [`fe2401d`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/fe2401d)

## Version 25 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Ideen für ein neues 3D-Spiel sammeln; Entscheidung für „Die Together“ (First-Person-Shooter, jede Figur von zwei Leuten gesteuert: Maus und Tastatur); Startprompt und Dateien für einen neuen Chat vorbereiten
**Änderungen:**
- Neuer vollständiger Spielplan `docs/DIE-TOGETHER.md`: Teams und Rollen, Menü, Steuerung, Pistole (5 Schuss, 1 s zwischen Schüssen, 2 s Nachladen nur mit R), 5 Leben, Anzeigen, Map mit Hindernissen und zusammenrückenden Wänden, Rundenablauf, Bot nur zu zweit, Verbindung mit dem Host als Schiedsrichter, Dateien, Reihenfolge der Arbeit und Testanleitung
- Darin auch die nötigen Launcher-Änderungen: neue Felder `minPlayers` und `evenPlayers` in `game.json`, Anzeige „2–8“, Play-Knopf nur bei gerader Party-Größe mit passenden Hinweisen
- Roadmap: geplantes drittes Spiel unter „Where things stand“, weitere Ideen aus dem Brainstorming unter „Ideas for later“
- Commit-Hash für Version 24 nachgetragen
**Geänderte Dateien:** docs/DIE-TOGETHER.md (neu), docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v25] docs: plan the game Die Together`
**GitHub-Commit:** [`ad53a7d`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/ad53a7d)

## Version 24 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** WPM Trainer: Profilbilder oben links in die Spiel-Leiste statt „Connected with …“; in der Launcher-Leiste wieder „Party“ statt der Bilder
**Änderungen:**
- WPM Trainer 1.5.0: Die Party steht als überlappende Profilbilder oben links in der Spiel-Leiste (links Bilder, rechts Video-Knöpfe); der Status-Text ist weg
- Gestrichelter Kreis mit „?“, solange der Mitspieler fehlt; grüner Ring für den Host, wenn der Gast bereit ist; Name beim Darüberfahren
- Die Spieler tauschen wieder ihre Profilbild-Links aus (nur geprüfte `https://`-Links)
- Player im Launcher: wieder das „Party“-Abzeichen statt der Bilder (sonst doppelt); die dafür gebaute Komponente `PartyAvatars` ist wieder entfernt
- Patch Note „WPM Trainer 1.5“, Punkt zu den Bildern aus „Launcher 1.8“ entfernt; Doku: ROADMAP, PARTY-GAMES, Entscheidung 34 angepasst; Commit-Hash für Version 22 und 23 nachgetragen
- Geprüft: lint, typecheck, build; zwei Tabs (Host und Gast) mit Bild und Anfangsbuchstabe, grüner Ring bei „bereit“
**Geänderte Dateien:** games/wpm-trainer/index.html, games/wpm-trainer/game.json, news/2026-11-15-wpm-trainer-1-5.md (neu), news/2026-11-15-launcher-1-8.md, src/pages/PlayerPage.tsx, src/features/party/PartyAvatars.tsx (gelöscht), docs/ROADMAP.md, docs/PARTY-GAMES.md, docs/DECISIONS.md, PROTOKOLL.md
**Commit-Message:** `[v24] feat(wpm-trainer): party pictures in the top bar, party badge back in the player bar`
**GitHub-Commit:** [`d666ee2`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/d666ee2)

## Version 23 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Play-Knöpfe in Store und Library entfernen (Spiele nur über die Spielseite starten), in einer Party kein „Play alone“ mehr und grauer Knopf mit Grund für Mitglieder, zu große Partys und Einzelspieler-Spiele; WPM Trainer: Party-Bilder in die Leiste oben, Video-Knöpfe in eine Leiste oben
**Änderungen:**
- Store: Der „Play“-Knopf beim Darüberfahren über ein Cover ist weg, das Cover führt zur Spielseite
- Library: „Continue playing“-Karten führen zur Spielseite (ohne runden Play-Knopf), bei „All played games“ ist der Play-Knopf weg (gilt auch für die Spielzeit-Liste im Profil)
- Spielseite: Ohne Party „Play“ wie bisher. In einer Party hat der Host nur noch „Play with party“; grauer Knopf mit Grund für Mitglieder („Only the party host can start games.“), für Einzelspieler-Spiele („Single player only. Leave the party to play it.“) und wenn die Party zu groß ist („Up to 2 players. Your party has 3.“)
- Player: Statt des „Party“-Abzeichens zeigt die Leiste oben die Profilbilder der Party (neue Komponente `PartyAvatars`), für alle Party-Spiele
- WPM Trainer 1.4.0: neue schmale Leiste ganz oben im Spiel mit allen Video-Knöpfen rechts (Link, „Load video“, „Own file“, Ton, Tempo) und links dem Party-Status in Worten („Waiting for the other player…“, „Connected with …“, „… is ready“, „Racing …“); die Bilder unten links und die Video-Karte unten rechts sind weg, der Trainer steht wieder mittig; Profilbilder werden zwischen den Spielern nicht mehr ausgetauscht
- Patch Notes „WPM Trainer 1.4“ und „Launcher 1.8“; Doku: PARTY-GAMES, ROADMAP, neue Entscheidung 34
- Geprüft: lint, typecheck, build; Store und Spielseite als Gast; WPM Trainer allein und mit zwei Tabs (Host und Gast) inkl. „… is ready“ und Handy-Breite. Nicht getestet (braucht Konten): die grauen Knöpfe in einer echten Party und die Profilbilder in der Player-Leiste
**Geänderte Dateien:** src/features/games/GameCard.tsx, src/features/library/ContinueCard.tsx, src/features/library/PlayedGameRow.tsx, src/features/party/GamePlayActions.tsx, src/features/party/PartyAvatars.tsx (neu), src/pages/PlayerPage.tsx, games/wpm-trainer/index.html, games/wpm-trainer/game.json, news/2026-11-15-wpm-trainer-1-4.md (neu), news/2026-11-15-launcher-1-8.md (neu), docs/PARTY-GAMES.md, docs/ROADMAP.md, docs/DECISIONS.md, PROTOKOLL.md
**Commit-Message:** `[v23] feat(party): start games only from the game page, party avatars in the player bar, WPM video bar at the top`
**GitHub-Commit:** [`2807719`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/2807719)

## Version 22 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Lohnt sich ein neuer Chat? Falls ja: Doku auf den neuesten Stand bringen, damit ein neuer Chat alles versteht, und einen Startprompt schreiben
**Änderungen:**
- Roadmap: Stand des WPM Trainers (Version 1.3.0, nur noch über die Party, Avatare, Video-Karte, Revanche über die Lobby) eingetragen; erledigten offenen Punkt „YouTube im Player prüfen“ entfernt
- Neue Entscheidung 33 (WPM Trainer nur über die Party, Launcher gibt das Profilbild an Spiele weiter)
- CLAUDE.md und games/README.md an die neue Party-Adresse und den WPM Trainer angepasst
- Commit-Hash für Version 21 nachgetragen
**Geänderte Dateien:** docs/ROADMAP.md, docs/DECISIONS.md, CLAUDE.md, games/README.md, PROTOKOLL.md
**Commit-Message:** `[v22] docs: update project state for a new session`
**GitHub-Commit:** [`2807719`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/2807719)

## Version 21 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** WPM Trainer: Anzeige oben links ganz entfernen, Party-Mitglieder als überlappende Avatare unten links, Video-Knöpfe von oben rechts nach unten rechts im Karten-Stil, bei Revanche erst Einstellungen ändern können
**Änderungen:**
- Anzeige oben links komplett entfernt; das Tipptempo des Gegners wird während der Runde nirgends mehr gezeigt (die Live-Nachrichten dafür sind entfernt)
- Party-Mitglieder unten links im freien Platz als überlappende Profilbilder wie bei „Party“ im Launcher (ohne Bild: Anfangsbuchstabe auf Farbe); gestrichelter Platzhalter, solange der Mitspieler fehlt; grüner Ring beim Host, wenn der Gegner bereit ist; Name beim Darüberfahren
- Der Launcher gibt dem Spiel dafür den Link zum eigenen Profilbild mit (`avatar` in der Adresse); die Spieler tauschen Name und Bild beim Verbinden aus
- Video-Bedienung (YouTube-Link, „Load video“, „Own file“, Ton, Tempo-Anzeige) als Karte unten rechts; über dem Video liegt nichts mehr
- Ist das Fenster schmaler als 1440 Pixel und neben dem Trainer kein Platz, rutschen beide Blöcke in eine Zeile über dem Trainer
- Revanche: Nach dem Ergebnis geht es zuerst zurück in die Lobby. Der Host kann Zeit, Ziel-Tempo und Video ändern und startet dann mit „▶ Start round“ (liegt jetzt über dem Wörterfeld) oder Enter; der Gast meldet „bereit“ und wartet
- Spielversion 1.3.0 mit Patch Note; Doku PARTY-GAMES (neue Angabe `avatar`) und ROADMAP angepasst; Commit-Hash für Version 20 nachgetragen
- Getestet mit zwei Tabs in Chrome (breites und schmales Fenster). Nicht getestet: echte Profilbilder über den Launcher mit zwei Konten
**Geänderte Dateien:** games/wpm-trainer/index.html, games/wpm-trainer/game.json, news/2026-11-15-wpm-trainer-1-3.md (neu), src/features/party/party-session.ts, src/features/party/usePartyLaunch.ts, docs/PARTY-GAMES.md, docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v21] feat(wpm-trainer): party avatars, video controls at the bottom, rematch via lobby`
**GitHub-Commit:** [`095fc24`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/095fc24)

## Version 20 – 2026-11-15 – Branch: main – von: Morris
**Prompt (Kurzfassung):** WPM Trainer: Raum-Code oben links entfernen (man spielt nur noch über die Party), Anzeige oben links mit den Spielernamen besser lesbar und schöner machen
**Änderungen:**
- „Create room“, Code-Feld, „Join“, „Copy link“ und „Leave“ entfernt; auch der alte Einladungslink `?room=CODE` funktioniert nicht mehr. Zusammen spielen geht nur noch über die Party im Launcher
- Allein gestartet zeigt das Spiel oben links gar nichts mehr an (reiner Einzelspieler)
- Neue Party-Anzeige oben links: Karte mit Status-Punkt (gelb = wartet, grün = verbunden), beiden Spielernamen, Markierung „you“ / „host“, „ready ✓“ und den Tippgeschwindigkeiten beider Spieler live; größere, gut lesbare Schrift
- Die eigene Geschwindigkeit steht jetzt ebenfalls in der Anzeige (vorher nur die des Gegners)
- Spielversion auf 1.2.0 erhöht, Patch Note dazu
- Getestet mit zwei Tabs in Chrome: verbinden, Runde starten, Live-Anzeige auf beiden Seiten
**Geänderte Dateien:** games/wpm-trainer/index.html, games/wpm-trainer/game.json, news/2026-11-15-wpm-trainer-1-2.md (neu), PROTOKOLL.md
**Commit-Message:** `[v20] feat(wpm-trainer): remove room codes, add readable party panel`
**GitHub-Commit:** [`2407805`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/2407805)

## Version 19 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Zweites Spiel „Blind Drop“ bauen: 3D-Comic-Bombenduell auf einer schwebenden Insel, 1 gegen 1 über die Party, Übungsmodus gegen Bot, Store-Eintrag und Patch Note
**Änderungen:**
- Neues Spiel `games/blind-drop/` (ohne Build-Schritt, three.js 0.187.0 und PeerJS 1.5.4 im Ordner `vendor/` mit Lizenzdateien)
- Ablauf wie festgelegt: Farbwahl (8 Farben, keine doppelt), 3 s Schauen, 5 s Action mit unsichtbarem Gegner (WASD, Linksklick setzt die Bombe einmal, Zielkreis nur für einen selbst), Aufdecken, Bomben fallen gleichzeitig, Auswertung, Insel schrumpft ohne Treffer und teleportiert Spieler zurück auf die Insel, Ergebnisbildschirm mit Rematch
- Comic-Stil: Toon-Shading mit dicken Umrissen, Sternenhimmel und Planeten, Insel mit Gras und Felsunterseite, Stern-Explosion in Spielerfarbe mit „BOOM!“, Rauchwolken und Kamerawackeln
- Mehrspieler: Der Host ist der Schiedsrichter (`host.js`); der Gast schickt nur Eingaben und Position. Während der unsichtbaren Phase wird keine Position des Gegners verschickt. Verbindung wie in PARTY-GAMES.md beschrieben, mit erneutem Versuch und Erkennung geschlossener Tabs
- Ohne Party: Übungsmodus gegen einen einfachen Bot
- Spieler sind überall eine Liste; für mehr Spieler später `MAX_PLAYERS` in `config.js` und `maxPlayers` in `game.json` erhöhen
- Store-Eintrag (`game.json`, `description.md`, Cover und Banner als SVG) und Patch Note „Blind Drop 1.0.0“
- Doku: ROADMAP (Stand, Ideen), DECISIONS 32, PARTY-GAMES (zweites Beispiel), games/README
- Getestet: Übungsmodus und Mehrspieler mit zwei Tabs in Chrome (Lobby, Farbsperre, Runde, Treffer, Schrumpfen, Rematch, dritter Spieler „voll“, Tab schließen). Noch offen: Test in Safari und mit zwei echten Konten über die Party
**Geänderte Dateien:** games/blind-drop/ (neu: index.html, game.js, host.js, scene.js, net.js, config.js, game.json, description.md, cover.svg, banner.svg, vendor/three.module.js, vendor/three.core.js, vendor/three-LICENSE.txt, vendor/peerjs.min.js, vendor/peerjs-LICENSE.txt), news/2026-11-14-blind-drop-1-0.md (neu), games/README.md, docs/ROADMAP.md, docs/DECISIONS.md, docs/PARTY-GAMES.md, PROTOKOLL.md
**Commit-Message:** `[v19] feat(games): add Blind Drop, a 3D bomb duel for two players`
**GitHub-Commit:** [`1dd893c`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/1dd893c)

## Version 18 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Weiß ein neuer Chat alles Wichtige aus dem Projektordner? Danach: neue Spielidee „Blind Drop“ festhalten, verworfene Spielidee entfernen, Prompt für die nächste Session
**Änderungen:**
- Roadmap aktualisiert, damit neue Chats den richtigen Stand lesen: alle SQL-Dateien 0001 bis 0008 sind ausgeführt, Phase 7 (online stellen) ist als nächste markiert
- Neuer Abschnitt „Ideas for later“ in der Roadmap: das nächste Spiel „Blind Drop“ mit allen festgelegten Regeln, dazu weitere Spiel- und Launcher-Ideen
- Commit-Hash für Version 17 nachgetragen
**Geänderte Dateien:** docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v18] docs(roadmap): update status and plan the game Blind Drop`
**GitHub-Commit:** [`1dd893c`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/1dd893c)

## Version 17 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Online-Status ist nirgends zu sehen – liegt es am Kollegen oder fehlt etwas?
**Änderungen:**
- Ursache: Der Status entsteht erst, wenn der Launcher eines Freundes mit dem neuen Code einmal offen war; bis dahin gab es keine Daten und es wurde gar nichts angezeigt
- Freunde ohne Daten werden jetzt als „Offline“ mit grauem Punkt angezeigt (ohne „last seen“), statt gar nicht
- Geprüft: Tabelle `user_status` und die Funktionen aus `0008_online_status.sql` sind in Supabase vorhanden; Commit-Hash für Version 15 und 16 nachgetragen
**Geänderte Dateien:** src/features/presence/queries.ts, src/features/presence/useStatusLabel.ts, src/types/models.ts, PROTOKOLL.md
**Commit-Message:** `[v17] fix(presence): show friends without status as offline`
**GitHub-Commit:** [`dba392a`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/dba392a)

## Version 16 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Datenschutzbehörde für Hessen eintragen, „typeshit“ wieder normal machen
**Änderungen:**
- Titel im Browser-Tab (`index.html`) war `typeshit`; jetzt wieder automatisch Name und Slogan aus `src/config/brand.ts` („NoSpaceStudio – No downloads. No space needed.“)
- Datenschutzerklärung: zuständige Aufsichtsbehörde für Hessen eingetragen (Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Wiesbaden)
- Erledigten Punkt zum Tab-Titel aus der Roadmap entfernt
**Geänderte Dateien:** index.html, legal/privacy.md, docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v16] fix: restore page title and add data protection authority`
**GitHub-Commit:** [`8890f20`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/8890f20)

## Version 15 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Online-Status für Freunde (mit „zuletzt gesehen“, ohne Unsichtbar-Modus); Impressum und Datenschutzerklärung schreiben und einfügen
**Änderungen:**
- Online-Status: Freunde sehen „Online“, „Playing <Spiel>“ oder „Offline · last seen …“; farbiger Punkt am Profilbild (grün online, violett spielt, grau offline) in Freundesliste, Party, Einladen-Fenster, „Friends who play“, Profil und bei den gestapelten Bildern neben „Party“
- Freundesliste und Einladen-Fenster zeigen Online-Freunde zuerst; neben „Friends“ in der Seitenleiste steht „N online“; das Profil eines Freundes zeigt den Status unter dem Namen
- Nur bestätigte Freunde sehen den Status; „als offline anzeigen“ gibt es bewusst nicht
- Neue SQL-Datei `0008_online_status.sql` (Tabelle `user_status`, Funktionen `report_status` und `friend_statuses`, Echtzeit), ausführlich kommentiert
- Impressum und Datenschutzerklärung auf Englisch geschrieben, als Dateien `legal/imprint.md` und `legal/privacy.md`; Name, Adresse, Kontakt-E-Mail und Datenschutzbehörde sind als `[TODO]` markiert, die Seiten zeigen bis dahin einen Warnhinweis
- Registrieren nur mit Bestätigung „mindestens 16 Jahre und Datenschutzerklärung gelesen“
- WPM Trainer lädt YouTube-Videos jetzt im erweiterten Datenschutzmodus (youtube-nocookie.com)
- Neuer Launcher-Patchnote 1.7.0; Doku angepasst (ROADMAP, DECISIONS 30 und 31, SUPABASE-SETUP, CLAUDE.md); Commit-Hash für Version 14 nachgetragen
- Noch offen: `0008_online_status.sql` in Supabase ausführen; die TODOs in `legal/` und die E-Mail in `src/config/brand.ts` ausfüllen; Online-Status mit echten Konten testen
**Geänderte Dateien:** supabase/migrations/0008_online_status.sql (neu), src/features/presence/ (neu: api.ts, queries.ts, PresenceReporter.tsx, PresenceAvatar.tsx, StatusLine.tsx, useStatusLabel.ts), src/features/legal/legal-texts.ts (neu), legal/imprint.md (neu), legal/privacy.md (neu), news/2026-11-14-launcher-1-7.md (neu), src/components/ui/ (Avatar.tsx, AvatarStack.tsx, Checkbox.tsx neu), src/components/layout/ (RootLayout.tsx, Sidebar.tsx), src/features/friends/ (UserRow.tsx, FriendList.tsx, queries.ts), src/features/party/ (InviteFriendsModal.tsx, PartyMembers.tsx), src/features/games/FriendsPlaytime.tsx, src/features/profile/ProfileView.tsx, src/features/auth/ (api.ts, username.ts), src/pages/ (LegalPage.tsx, SignUpPage.tsx, UiKitPage.tsx), src/types/ (models.ts, database.ts), src/lib/query-keys.ts, games/wpm-trainer/index.html, news/2026-11-14-wpm-trainer-1-1.md, docs/ROADMAP.md, docs/DECISIONS.md, docs/SUPABASE-SETUP.md, CLAUDE.md, PROTOKOLL.md
**Commit-Message:** `[v15] feat: add online status for friends, imprint and privacy policy`
**GitHub-Commit:** [`8890f20`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/8890f20)

## Version 14 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** WPM-Spiel komplett auf Englisch, Hinweis „Menüs auf Deutsch“ aus der Beschreibung streichen, Patchnotes für das Spiel und alle Launcher-Versionen als Zeitleiste, YouTube-Feld ohne Video schwer anklickbar beheben
**Änderungen:**
- WPM Trainer komplett ins Englische übersetzt: Knöpfe, Hinweise, Fingernamen, Ergebnisse, Mehrspieler-Meldungen; die deutsche Wortliste bleibt als Auswahl „German“ erhalten
- Fehler behoben: Ohne Video lag die Fläche „No video loaded“ über dem YouTube-Feld und den Raum-Knöpfen, Klicks kamen dort nicht an; die obere Leiste liegt jetzt darüber
- Zeile „The game's own menus are in German“ aus der Spielbeschreibung entfernt; Spielversion auf 1.1.0 erhöht
- Patchnotes als News-Dateien: WPM Trainer 1.0.0 und 1.1.0 (erscheinen auch auf der Spielseite) sowie Launcher 1.0.0 bis 1.6.0, mit den echten Zeitpunkten aus der Git-Historie
- News-Seite als Zeitleiste von oben nach unten (Linie mit Punkt pro Beitrag, der neueste leuchtet)
- Commit-Hash für Version 13 nachgetragen
**Geänderte Dateien:** games/wpm-trainer/ (index.html, game.json, description.md), news/ (9 neue Beiträge: 2026-11-14-launcher-1-0.md bis 1-6.md, 2026-11-14-wpm-trainer-1-0.md, 2026-11-14-wpm-trainer-1-1.md), src/features/news/NewsTimeline.tsx (neu), src/pages/NewsPage.tsx, PROTOKOLL.md
**Commit-Message:** `[v14] feat: translate WPM trainer to English, add patch notes and news timeline`
**GitHub-Commit:** [`0f52884`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/0f52884)

## Version 13 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Block „Play together“ auf der Party-Seite löschen, Knopf „Play alone“ deutlicher machen (wie der Play-Knopf in der Library)
**Änderungen:**
- Block „Play together“ von der Party-Seite entfernt; Spiele startet der Host jetzt auf der Spielseite mit „Play with party“
- „Play alone“ auf der Spielseite ist jetzt ein richtiger Knopf mit Rand, grauem Hintergrund und Hover-Effekt, genau wie „Play“ unter „All played games“
- Doku angepasst; Commit-Hash für Version 12 nachgetragen
**Geänderte Dateien:** src/pages/PartyPage.tsx, src/features/party/GamePlayActions.tsx, src/features/party/PartyGames.tsx (gelöscht), docs/PARTY-GAMES.md, docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v13] refactor(party): remove play together block, make play alone a button`
**GitHub-Commit:** [`318ddf9`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/318ddf9)

## Version 12 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Party als eigener Bereich in der Seitenleiste mit gestapelten Profilbildern, Mitglieder kicken und Host weitergeben, Host/Mitglied kennzeichnen; Featured-Banner aus dem Store entfernen
**Änderungen:**
- Neuer Bereich „Party“ in der Seitenleiste und im Handy-Menü mit eigener Seite `/party`; der Party-Kasten in der Library ist dafür weg
- Wer in einer Party ist, sieht neben „Party“ in der Seitenleiste die Profilbilder der Mitglieder übereinander gestapelt, auf jeder Seite (ab 4 Mitgliedern mit „+N“)
- Party-Seite: „Your party:“ mit Mitgliederzahl, jeder Spieler als „Host“ (Krone) oder „Member“ gekennzeichnet, offene Einladungen als „Invited“, Freunde einladen, Party verlassen, Mehrspieler-Spiele starten
- Der Host kann Mitglieder entfernen und einen anderen zum Host machen, jeweils mit Sicherheitsabfrage
- Neue SQL-Datei `0007_party_host_tools.sql` für Entfernen und Host-Weitergabe, ausführlich kommentiert
- Zähler für Party-Einladungen sitzt jetzt an „Party“ statt an „Library“
- Featured-Banner im Store entfernt, inklusive dem Feld `featured` in `game.json`; der Store zeigt alle Spiele einheitlich als gleich große Cover
- Gestapelte Profilbilder und Rollen-Abzeichen in der Komponenten-Übersicht `/dev/ui`
- Doku angepasst (PARTY-GAMES, ROADMAP, DECISIONS 29, SUPABASE-SETUP, ADDING-A-GAME)
- Noch offen: `0007_party_host_tools.sql` muss in Supabase ausgeführt werden; Party-Seite und Seitenleiste mit echter Party sind ohne Anmeldung nicht getestet
**Geänderte Dateien:** supabase/migrations/0007_party_host_tools.sql (neu), src/pages/PartyPage.tsx (neu), src/features/party/ (PartyMembers.tsx, PartyGames.tsx, PartyRoleBadge.tsx neu; PartyPanel.tsx gelöscht; api.ts, queries.ts), src/components/ui/AvatarStack.tsx (neu), src/components/layout/ (Sidebar.tsx, SidebarLink.tsx, nav-items.ts, useNavBadges.ts), src/features/games/ (FeaturedHero.tsx gelöscht, api.ts), src/pages/ (StorePage.tsx, LibraryPage.tsx, UiKitPage.tsx), src/routes/ (router.tsx, paths.ts), src/types/ (models.ts, database.ts), games/_template/game.json, games/wpm-trainer/game.json, docs/PARTY-GAMES.md, docs/ROADMAP.md, docs/DECISIONS.md, docs/SUPABASE-SETUP.md, docs/ADDING-A-GAME.md, PROTOKOLL.md
**Commit-Message:** `[v12] feat(party): add party page with host tools and sidebar avatars, remove featured banner`
**GitHub-Commit:** [`a729f50`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/a729f50)

## Version 11 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Balls' Tipp-Spiel (WPM-Trainer mit PeerJS, bisher auf Vercel) einbauen, Spielzeit (Phase 4) und Party-System umsetzen, aufräumen; Bildschirmaufnahme weglassen
**Änderungen:**
- Spiel `games/wpm-trainer/` eingebaut (99-Finger WPM Trainer): Vercel-Dateien entfernt, PeerJS liegt jetzt im Spielordner (`vendor/`) statt von fremder Seite geladen, Bildschirmaufnahme entfernt, Store-Eintrag mit Beschreibung, Cover und Banner
- Spiel versteht den Party-Modus: Mit den Daten vom Launcher verbinden sich Host und Gast automatisch, ohne Raum-Code; Namen der Spieler werden angezeigt; Gäste warten, bis der Host bereit ist
- Phase 4: Spielzeit wird beim Spielen gespeichert (alle 30 Sekunden, beim Tab-Wechsel und beim Verlassen); Library, „Continue playing“, Profil-Statistik und „Most played“ nutzen echte Zahlen; Gäste sehen den Hinweis, dass ihre Zeit nicht gespeichert wird
- Party-System (neue Phase 8): Party in der Library starten, Freunde einladen, Einladungen oben auf jeder Seite annehmen oder ablehnen, Zähler an „Library“; der Host startet ein Mehrspieler-Spiel und alle Mitglieder werden automatisch hineingezogen; Einzelspieler-Spiele zeigen „Single player only“
- Neue SQL-Datei `0006_parties.sql` (Partys, Mitglieder, Einladungen, Echtzeit-Updates), ausführlich kommentiert
- `game.json` kennt jetzt `maxPlayers`; Spielkarten im Store zeigen Mehrspieler-Spiele an, die Spielseite die Spielerzahl
- Neue Anleitung `docs/PARTY-GAMES.md` (wie die Party funktioniert und was ein Spiel dafür können muss); Roadmap (Phase 4 und 8 erledigt), DECISIONS (25 bis 28), Setup-Anleitung, ADDING-A-GAME, READMEs und CLAUDE.md angepasst
- Noch offen: `0006_parties.sql` muss in Supabase ausgeführt werden; Spielzeit, Party und Mitziehen sind ohne echte Konten nicht getestet (die Spielverbindung selbst wurde mit zwei Browser-Tabs getestet); die hochgeladene `wpm-games-main.zip` wurde nach dem Einbau gelöscht
**Geänderte Dateien:** games/wpm-trainer/ (neu: index.html, game.json, description.md, cover.svg, banner.svg, vendor/peerjs.min.js, vendor/peerjs-LICENSE.txt), games/README.md, supabase/migrations/0006_parties.sql (neu), src/features/party/ (neu: api.ts, queries.ts, party-session.ts, PartyWatcher.tsx, PartyNotices.tsx, PartyPanel.tsx, InviteFriendsModal.tsx, GamePlayActions.tsx, useOpenPartyGame.ts, usePartyLaunch.ts), src/features/player/ (usePlaytimeTracker.ts neu, GameFrame.tsx), src/features/library/api.ts, src/features/games/ (api.ts, GameCard.tsx), src/components/layout/ (RootLayout.tsx neu, useNavBadges.ts neu, useIncomingRequestCount.ts gelöscht, AppShell.tsx, Sidebar.tsx, MobileNav.tsx), src/pages/ (PlayerPage.tsx, GamePage.tsx, LibraryPage.tsx), src/routes/router.tsx, src/lib/ (content.ts, query-keys.ts), src/types/ (models.ts, database.ts), docs/PARTY-GAMES.md (neu), docs/ROADMAP.md, docs/DECISIONS.md, docs/SUPABASE-SETUP.md, docs/ADDING-A-GAME.md, README.md, CLAUDE.md, PROTOKOLL.md, .gitignore, .claude/launch.json
**Commit-Message:** `[v11] feat: add WPM trainer game, playtime tracking and parties`
**GitHub-Commit:** [`21552e9`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/21552e9)

## Version 10 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Profilbild hinzufügen: vom eigenen Gerät wählen, danach nicht mehr änderbar, mit roter Warnung beim Auswählen
**Änderungen:**
- Auf dem eigenen Profil gibt es den Knopf „Add profile picture“, solange man noch kein Bild hat
- Nach der Dateiauswahl zeigt ein Fenster die runde Vorschau und eine rote Warnung, dass das Bild nicht mehr geändert oder entfernt werden kann; erst „Use this picture“ lädt es hoch
- Das Bild wird auf dem Gerät mittig quadratisch zugeschnitten und auf 512 × 512 Pixel verkleinert (WebP, notfalls JPEG), bevor es hochgeladen wird
- Neue SQL-Datei `0005_one_time_avatar.sql`: Die Datenbank erlaubt genau ein Profilbild pro Nutzer, Überschreiben und Löschen sind gesperrt; `avatar_url` speichert jetzt den Pfad im Speicher statt einer Web-Adresse
- `docs/SUPABASE-SETUP.md` um „Ein Profilbild entfernen“ (von Hand im Dashboard) ergänzt; DECISIONS (24), Roadmap und CLAUDE.md angepasst; Commit-Hash für Version 9 nachgetragen
- Noch offen: `0005_one_time_avatar.sql` muss einmal im Supabase SQL Editor ausgeführt werden; der Upload ist noch nicht mit einem echten Konto getestet
**Geänderte Dateien:** supabase/migrations/0005_one_time_avatar.sql (neu), src/lib/image.ts (neu), src/features/profile/ (AvatarPicker.tsx neu, queries.ts neu, api.ts, ProfileView.tsx), src/types/database.ts, docs/SUPABASE-SETUP.md, docs/DECISIONS.md, docs/ROADMAP.md, CLAUDE.md, PROTOKOLL.md
**Commit-Message:** `[v10] feat(profile): add one-time profile picture upload`
**GitHub-Commit:** [`98dc7d0`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/98dc7d0)

## Version 9 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Freunde hinzufügen können: Freundesfunktion an Supabase anschließen (Phase 5 vor Phase 4)
**Änderungen:**
- Freundesliste, Anfragen und Spielersuche kommen jetzt aus der Datenbank statt aus Mock-Daten
- Suche nach Benutzernamen (Anfang des Namens, ab 2 Zeichen); man selbst, Freunde und offene Anfragen werden ausgeblendet
- Anfragen senden, annehmen, ablehnen, zurückziehen und Freunde entfernen funktionieren; schicken sich zwei gegenseitig eine Anfrage, sind sie sofort befreundet
- Neuer Knopf „Add friend“ auf dem Profil anderer Spieler (bzw. „Accept friend request“ oder „Friend request sent“)
- Zähler für offene Anfragen in der Seitenleiste aktualisiert sich jede Minute und beim Zurückkehren in den Tab
- Spielzeit wird aus der Datenbank gelesen (eigene und die von Freunden); geschrieben wird sie erst in Phase 4, bis dahin steht überall 0
- Gäste sehen auf der Spielseite „Sign in to see which of your friends play this“ statt eines Ladebalkens
- Mock-Backend `src/mocks/` vollständig entfernt
- Roadmap (Phase 5 erledigt), README und CLAUDE.md angepasst; Commit-Hash für Version 5 bis 8 nachgetragen
**Geänderte Dateien:** src/features/friends/ (api.ts neu, FriendshipAction.tsx neu, queries.ts), src/features/library/ (api.ts neu, queries.ts), src/features/profile/ProfileView.tsx, src/features/games/FriendsPlaytime.tsx, src/lib/query-keys.ts, src/mocks/ (gelöscht), docs/ROADMAP.md, README.md, CLAUDE.md, PROTOKOLL.md
**Commit-Message:** `[v9] feat(friends): connect friends and playtime reading to Supabase`
**GitHub-Commit:** [`6421498`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/6421498)

## Version 8 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Spiele und News auf Dateien im Repo umbauen, Admin-Panel streichen, SQL-Dateien ausführlich kommentieren
**Änderungen:**
- Spiele kommen nicht mehr aus Supabase, sondern aus dem Repo: jeder Ordner `games/<slug>/` hat eine `game.json` (Store-Eintrag), optional eine `description.md` und seine Bilder
- News sind Markdown-Dateien im neuen Ordner `news/` mit einem Kopfblock (Titel, Typ, Datum, Spiel, Version)
- Fehler in einer `game.json` oder News-Datei werden im Store bzw. in den News mit Dateiname und Feld angezeigt
- Entwürfe (`"status": "draft"`) und Beiträge mit Datum in der Zukunft sind nur lokal sichtbar
- Admin-Panel gestrichen: Admin-Seite, Admin-Route, Admin-Link und das Feld `is_admin` entfernt
- SQL neu geschnitten auf vier Dateien (Profile, Freundschaften, Spielzeit, Avatar-Speicher); Tabellen für Spiele und News sowie `seed.sql` entfallen; Spielzeit wird über den Ordnernamen des Spiels gespeichert, neue Tabelle `game_stats` für die Gesamtspielzeit pro Spiel
- Alle SQL-Dateien ausführlich kommentiert: Begriffe (RLS, Policy, Trigger, security definer) oben in `0001_profiles.sql` erklärt, jeder Abschnitt beschreibt, was er tut und warum
- Neue Anleitung `docs/ADDING-A-GAME.md` (Spiel und News hinzufügen); `docs/SUPABASE-SETUP.md`, Roadmap, DECISIONS (21 bis 23), README, CLAUDE.md und `games/README.md` angepasst
- Vorlagen ergänzt: `games/_template/game.json`, `games/_template/description.md`, `news/_template.md`
- Noch offen: Die SQL-Dateien sind weiterhin nicht gegen ein echtes Supabase-Projekt gelaufen
**Geänderte Dateien:** supabase/migrations/ (0001_profiles.sql neu geschrieben; 0002_friendships.sql, 0003_playtime.sql, 0004_storage.sql neu; 0002_games_and_news.sql, 0003_friendships.sql, 0004_playtime.sql, 0005_storage.sql gelöscht), supabase/seed.sql (gelöscht), docs/ADDING-A-GAME.md, docs/SUPABASE-SETUP.md, docs/ROADMAP.md, docs/DECISIONS.md, README.md, CLAUDE.md, PROTOKOLL.md, games/README.md, games/_template/ (game.json, description.md), news/_template.md, .github/ISSUE_TEMPLATE/new_game.yml, src/lib/ (content.ts neu, errors.ts), src/types/ (database.ts, models.ts), src/features/games/api.ts, src/features/news/api.ts, src/features/profile/ (api.ts, ProfileView.tsx), src/features/auth/RequireAdmin.tsx (gelöscht), src/pages/AdminPage.tsx (gelöscht), src/routes/ (router.tsx, paths.ts), src/components/layout/Sidebar.tsx
**Commit-Message:** `[v6][v7][v8] feat: add accounts with Supabase, file-based games and news catalogue`
**GitHub-Commit:** [`2dbccf4`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/2dbccf4)

## Version 7 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Die zwei unbenutzten Mock-Dateien löschen
**Änderungen:**
- `src/mocks/games.ts` und `src/mocks/news.ts` gelöscht; Spiele und News kommen seit Version 6 aus der Datenbank
- Hinweis dazu aus der Roadmap entfernt
**Geänderte Dateien:** src/mocks/games.ts (gelöscht), src/mocks/news.ts (gelöscht), docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v6][v7] feat(auth): add Supabase schema, accounts and real games and news data`
**GitHub-Commit:** [`2dbccf4`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/2dbccf4)

## Version 6 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Nächste offene Phase umsetzen: Phase 3 – Supabase, Datenbank und Konten
**Änderungen:**
- Datenbank als fünf Migrationen in `supabase/migrations/`: Profile, Spiele, News, Freundschaften, Spielzeit und Bild-Speicher, überall mit Row Level Security; `is_admin` und der Benutzername sind für Nutzer nicht änderbar
- Trigger legt beim Registrieren automatisch das Profil an; RPC-Funktionen `record_playtime` (mit Obergrenze pro Aufruf), `send_friend_request` und `accept_friend_request` für die Phasen 4 und 5 schon vorhanden
- Optionale Testdaten in `supabase/seed.sql` (ein Test-Spiel auf `_template`, ein Test-Beitrag)
- Supabase-Client, Auth-Context und geschützte Routen: Library, Friends, Profil und Admin brauchen ein Konto, Admin zusätzlich `is_admin`; Gäste können stöbern und spielen
- Neue Seiten: Sign in, Create account (mit Live-Prüfung des Benutzernamens), Forgot password, Reset password; Abmelden im Profilmenü funktioniert, Gäste sehen „Sign in“
- Spiele und News kommen jetzt aus der Datenbank statt aus Mock-Daten; Spielzeit und Freunde bleiben bis Phase 4/5 auf dem Mock
- Ohne Supabase-Werte in der `.env` startet die App trotzdem und zeigt einen Hinweis auf die Anleitung
- Schritt-für-Schritt-Anleitung `docs/SUPABASE-SETUP.md` (Projekt anlegen, SQL ausführen, `.env` ausfüllen, Admin werden)
- Roadmap (Phase 3 erledigt), DECISIONS (16 bis 21), README und CLAUDE.md aktualisiert
- Noch offen: Die SQL-Dateien wurden ohne lokale Datenbank geschrieben und sind noch nicht gegen ein echtes Supabase-Projekt gelaufen
**Geänderte Dateien:** supabase/migrations/ (0001_profiles.sql, 0002_games_and_news.sql, 0003_friendships.sql, 0004_playtime.sql, 0005_storage.sql), supabase/seed.sql, docs/SUPABASE-SETUP.md, docs/ROADMAP.md, docs/DECISIONS.md, README.md, CLAUDE.md, PROTOKOLL.md, .env.example, .claude/launch.json, package.json, package-lock.json, public/game-placeholder.svg, src/main.tsx, src/config/env.ts, src/lib/ (supabase.ts, errors.ts, query-keys.ts), src/types/database.ts, src/routes/ (router.tsx, paths.ts), src/components/ui/ (Notice.tsx, ErrorState.tsx), src/components/layout/ (ProfileMenu.tsx, Sidebar.tsx), src/features/auth/ (api.ts, queries.ts, auth-context.ts, auth-errors.ts, AuthProvider.tsx, AuthLayout.tsx, AuthCard.tsx, AuthGate.tsx, GuestOnly.tsx, RequireAuth.tsx, RequireAdmin.tsx, TextLink.tsx, UsernameField.tsx, useUsernameCheck.ts, username.ts, redirect-target.ts), src/features/profile/api.ts, src/features/games/ (api.ts, queries.ts), src/features/news/ (api.ts, queries.ts), src/features/library/queries.ts, src/mocks/ (api.ts, users.ts), src/pages/ (SignInPage, SignUpPage, ForgotPasswordPage, ResetPasswordPage neu; StorePage, NewsPage, GamePage, PlayerPage, ProfilePage, AdminPage geändert)
**Commit-Message:** `[v6] feat(auth): add Supabase schema, accounts and real games and news data`
**GitHub-Commit:** [`2dbccf4`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/2dbccf4)

## Version 5 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Phasenplan aus dem Startprompt als Datei im Repo ablegen
**Änderungen:**
- `docs/ROADMAP.md` angelegt: Status der Phasen, aktueller Stand, Arbeitsweise, Zielfunktionen, Datenmodell, Beschreibung der Phasen 3 bis 7 und offene Punkte
- CLAUDE.md und README verweisen auf die Roadmap; neue Sessions brauchen den Startprompt damit nicht mehr
- Commit-Hash für Version 3 und 4 nachgetragen (beide stecken im Commit „Version 3“)
**Geänderte Dateien:** docs/ROADMAP.md, CLAUDE.md, README.md, PROTOKOLL.md
**Commit-Message:** `[v5] docs: add roadmap with phase plan and status`
**GitHub-Commit:** [`2dbccf4`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/2dbccf4)

## Version 4 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Auch die Demo-Freunde und Demo-Nutzer löschen
**Änderungen:**
- Alle sieben Demo-Nutzer entfernt; die Liste in `src/mocks/users.ts` ist jetzt leer (nur der vorläufig angemeldete Nutzer `pixel_pilot` bleibt, bis es echte Konten gibt)
- Demo-Freundschaften und offene Demo-Anfragen entfernt; die Friends-Seite startet leer, der Zähler in der Sidebar ist weg
- docs/DECISIONS.md angepasst
**Geänderte Dateien:** src/mocks/users.ts, src/mocks/api.ts, docs/DECISIONS.md, PROTOKOLL.md
**Commit-Message:** `[v3][v4] chore: remove all demo content (games, news, playtime, players)`
**GitHub-Commit:** [`8cba7c2`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/8cba7c2)

## Version 3 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Alle Demo-Spiele und Demo-News löschen, damit die Plattform sauber und leer startet
**Änderungen:**
- Alle acht Demo-Einträge im Spielekatalog und alle sechs Demo-News entfernt; die Listen in `src/mocks/games.ts` und `src/mocks/news.ts` sind jetzt leer
- Demo-Spielzeiten entfernt (Library und Profil starten leer)
- Die beiden Demo-Spiele `games/star-dodger/` und `games/tile-shift/` gelöscht; `games/_template/` bleibt als Startvorlage für eigene Spiele
- Generator für Platzhalter-Grafiken (`src/mocks/art.ts`) entfernt, da nicht mehr gebraucht
- Leerzustände angepasst: Store blendet Filterleiste und Zähler ohne Spiele aus, News zeigt „No news yet“, Profil zeigt bei null Spielzeit „None yet“
- README, games/README.md und docs/DECISIONS.md angepasst; Commit-Hash von Version 2 nachgetragen
**Geänderte Dateien:** src/mocks/games.ts, src/mocks/news.ts, src/mocks/api.ts, src/mocks/art.ts (gelöscht), src/pages/StorePage.tsx, src/pages/NewsPage.tsx, src/features/profile/ProfileView.tsx, games/star-dodger/ (gelöscht), games/tile-shift/ (gelöscht), games/_template/index.html, games/README.md, README.md, docs/DECISIONS.md, PROTOKOLL.md
**Commit-Message:** `[v3] chore: remove demo games, demo news and demo playtime`
**GitHub-Commit:** [`8cba7c2`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/8cba7c2)

## Version 2 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Phase 2 – App-Shell und komplette Oberfläche mit Mock-Daten, zwei Demo-Spiele
**Änderungen:**
- App-Shell: Sidebar (Store, Library, Friends, News, unten Admin und Profil), Top-Bar mit globaler Suche (Taste `/`) und Profil-Menü, Footer, auf kleinen Bildschirmen Tab-Leiste unten
- Store: Featured-Banner, Spielkarten mit Engine-Label und Play-Button, Live-Suche, Genre-Filter (Mehrfachauswahl), Engine-Filter, Sortierung (Newest, A–Z, Most played); Filter stehen in der URL
- Spieldetailseite: Hero-Banner, Beschreibung, Screenshot-Galerie mit Lightbox, Patchnotes, eigene Spielzeit, Spielzeit von Freunden
- Player: Spiel im abgesicherten iframe von eigener Origin, Leiste mit Zurück, Session-Timer (läuft nur bei sichtbarem Tab) und Fullscreen
- Library (Continue playing, alle gespielten Spiele), Friends (Suche, Anfragen senden/annehmen/ablehnen, entfernen), News (Feed mit Typ-Filter, Markdown), Profil (Statistiken, meistgespielte Spiele, Freundesprofile)
- Platzhalterseiten: Imprint, Privacy, Admin
- Mock-Daten und Mock-Backend in `src/mocks/`, Datenzugriff über TanStack Query
- Zwei spielbare Demo-Spiele: Star Dodger (Canvas-Arcade) und Tile Shift (Schiebepuzzle), dazu `games/_template/` als Startvorlage
- Zweiter Dev-Server für `games/` auf Port 5174; `npm run dev` startet jetzt beide Server
- README, CLAUDE.md und docs/DECISIONS.md aktualisiert; Commit-Hash von Version 1 nachgetragen
**Geänderte Dateien:** package.json, package-lock.json, tsconfig.node.json, vite.games.config.ts, README.md, CLAUDE.md, PROTOKOLL.md, docs/DECISIONS.md, games/ (README.md, star-dodger/, tile-shift/, _template/), src/main.tsx, src/styles/index.css, src/config/env.ts, src/types/models.ts, src/lib/ (format.ts, query-client.ts, query-keys.ts), src/hooks/useDebouncedValue.ts, src/mocks/ (api.ts, art.ts, games.ts, news.ts, users.ts), src/routes/ (router.tsx, paths.ts), src/components/layout/ (neu), src/components/ui/ (Avatar, Chip, ErrorState, Lightbox, ListSkeleton, Markdown, PageHeader, Select), src/features/ (auth, games, player, library, friends, news, profile), src/pages/ (StorePage, GamePage, PlayerPage, LibraryPage, FriendsPage, NewsPage, ProfilePage, LegalPage, AdminPage neu; NotFoundPage, UiKitPage geändert; HomePage entfernt)
**Commit-Message:** `[v2] feat: add app shell, all main pages on mock data and two demo games`
**GitHub-Commit:** [`e62cae5`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/e62cae5)

## Version 1 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Phase 1 – Projekt-Fundament und GitHub-Basis aufsetzen
**Änderungen:**
- Projekt aufgesetzt: Vite, React 19, TypeScript (strict), Tailwind CSS v4, React Router, ESLint, Prettier
- Design-Tokens (Farben, Radien, Schatten, Schrift, Animationen) in `src/styles/index.css`, Akzentfarbe Violett, Schrift Inter (selbst gehostet)
- Basis-Komponenten: Button, IconButton, Input, Badge, Card, Modal, Toast, Skeleton, EmptyState
- Zentrale Marken-Konfiguration `src/config/brand.ts` (Name, Slogan, Logo, Kontakt-E-Mail als Platzhalter); Name wird beim Build auch in `index.html` eingesetzt
- Logo (Wortmarke + „N“-Zeichen) als SVG und Favicon
- Vorläufige Startseite, Komponenten-Übersicht unter `/dev/ui` und 404-Seite
- GitHub-Basis: README, MIT-Lizenz, CONTRIBUTING, CLAUDE.md, PR-Template, Issue-Templates (Bug, Feature, Neues Spiel), CI-Workflow (Lint, Format, Typecheck, Build)
- `docs/DECISIONS.md` mit den bisherigen Entscheidungen, dieses Protokoll angelegt
**Geänderte Dateien:** package.json, package-lock.json, index.html, vite.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json, eslint.config.js, .prettierrc.json, .prettierignore, .editorconfig, .nvmrc, .gitignore, .env.example, LICENSE, README.md, CONTRIBUTING.md, CLAUDE.md, PROTOKOLL.md, docs/DECISIONS.md, .github/workflows/ci.yml, .github/pull_request_template.md, .github/ISSUE_TEMPLATE/ (bug_report.yml, feature_request.yml, new_game.yml, config.yml), public/ (favicon.svg, logo.svg), src/main.tsx, src/vite-env.d.ts, src/config/brand.ts, src/styles/index.css, src/lib/cn.ts, src/hooks/useDocumentTitle.ts, src/routes/ (router.tsx, paths.ts), src/pages/ (HomePage.tsx, UiKitPage.tsx, NotFoundPage.tsx), src/components/brand/ (Logo.tsx, LogoMark.tsx), src/components/ui/ (Button.tsx, button-styles.ts, IconButton.tsx, Input.tsx, Badge.tsx, Card.tsx, Modal.tsx, Skeleton.tsx, EmptyState.tsx, ToastProvider.tsx, toast-context.ts)
**Commit-Message:** `[v1] feat: set up project foundation, design system and GitHub basics`
**GitHub-Commit:** [`7c33b9c`](https://github.com/RezzardOnKeys/NoSpaceStudio/commit/7c33b9c)
