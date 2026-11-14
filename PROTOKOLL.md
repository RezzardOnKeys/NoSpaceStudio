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
**GitHub-Commit:** _ausstehend_

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
