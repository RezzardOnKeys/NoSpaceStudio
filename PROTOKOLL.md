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
**GitHub-Commit:** _ausstehend_

## Version 7 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Die zwei unbenutzten Mock-Dateien löschen
**Änderungen:**
- `src/mocks/games.ts` und `src/mocks/news.ts` gelöscht; Spiele und News kommen seit Version 6 aus der Datenbank
- Hinweis dazu aus der Roadmap entfernt
**Geänderte Dateien:** src/mocks/games.ts (gelöscht), src/mocks/news.ts (gelöscht), docs/ROADMAP.md, PROTOKOLL.md
**Commit-Message:** `[v6][v7] feat(auth): add Supabase schema, accounts and real games and news data`
**GitHub-Commit:** _ausstehend_

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
**GitHub-Commit:** _ausstehend_

## Version 5 – 2026-11-14 – Branch: main – von: Morris
**Prompt (Kurzfassung):** Phasenplan aus dem Startprompt als Datei im Repo ablegen
**Änderungen:**
- `docs/ROADMAP.md` angelegt: Status der Phasen, aktueller Stand, Arbeitsweise, Zielfunktionen, Datenmodell, Beschreibung der Phasen 3 bis 7 und offene Punkte
- CLAUDE.md und README verweisen auf die Roadmap; neue Sessions brauchen den Startprompt damit nicht mehr
- Commit-Hash für Version 3 und 4 nachgetragen (beide stecken im Commit „Version 3“)
**Geänderte Dateien:** docs/ROADMAP.md, CLAUDE.md, README.md, PROTOKOLL.md
**Commit-Message:** `[v5] docs: add roadmap with phase plan and status`
**GitHub-Commit:** _ausstehend_

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
