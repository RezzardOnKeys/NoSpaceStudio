# Roadmap

The plan for the prototype: what we are building, in which order, and where we
are. This file is the reference for every work session. Update the status
table whenever a phase is finished.

## Status

| Phase | Topic                                | Status |
| ----- | ------------------------------------ | ------ |
| 0     | Review and plan                      | Done   |
| 1     | Project foundation and GitHub basics | Done   |
| 2     | App shell and interface on mock data | Done   |
| 3     | Supabase: database and accounts      | Done   |
| 4     | Playtime, library and profile        | Done   |
| 5     | Friends                              | Done   |
| 6     | Content guides and engine notes      | Open   |
| 7     | Polish and deployment                | Open   |
| 8     | Parties and multiplayer              | Done   |

### Where things stand

- **The first game is in:** `games/wpm-trainer/` (99-Finger WPM Trainer by
  Balls), a typing race for 2 players. Screen recording was removed on
  request; PeerJS is shipped in the game folder (`vendor/`).
- **Games and news are files in the repository**, not database rows
  (decision 22). A game is a folder `games/<slug>/` with a `game.json`
  (store entry), an optional `description.md` and its images. A news post is
  a Markdown file in `news/`. Adding content is one commit; see
  [ADDING-A-GAME.md](ADDING-A-GAME.md). **There is no admin panel.**
- **Accounts are real** (Supabase): sign-up with unique username, sign-in,
  sign-out, forgot and reset password, one-time profile picture. Setup:
  [SUPABASE-SETUP.md](SUPABASE-SETUP.md).
- **Friends are real:** search, requests, friend profiles with playtime,
  "Add friend" on profiles, badge for open requests.
- **Playtime is tracked:** a heartbeat every 30 visible seconds (and when the
  tab is hidden or the player closes) calls `record_playtime`. Library,
  "Continue playing", profile statistics and the "Most played" sorting use
  real data. Guests can play, but their time is not saved.
- **Parties** (phase 8): own "Party" section in the sidebar (with the
  members' pictures stacked next to it on every page). Invite friends, kick
  members, pass the host role on; the host starts a multiplayer game and all
  members are pulled into it.
  Single player games say that the party does not come along. How a game
  supports parties: [PARTY-GAMES.md](PARTY-GAMES.md).
- The database schema is in `supabase/migrations/` (0001 to 0007). Each file
  is run once in the Supabase SQL editor; **0007_party_host_tools.sql is new and still
  has to be run.** Games are referenced by their slug (folder name).
- **Claude cannot test anything that needs an account** (no passwords).
  Playtime saving, the profile picture upload and all party flows are only
  checked by typecheck and as a guest; the developers test them with their
  two accounts. The game's party connection itself was tested with two
  browser tabs.
- Without Supabase values in `.env` the app still starts: the store, news
  and games work, everyone is a guest.
- `/imprint` and `/privacy` are placeholder pages.

## How we work

- **Phase by phase.** After each phase: stop, hand over (summary, file list,
  commit message, test instructions; see [CLAUDE.md](../CLAUDE.md)) and wait
  for the developers to say "weiter".
- At the end of every phase `npm run lint`, `npm run typecheck` and
  `npm run build` pass. Where possible, start the dev servers and check the
  pages in a browser.
- When the developers have to do something themselves (create a Supabase
  project, run SQL, set environment variables), explain it step by step, in
  German and beginner-friendly.
- For important decisions that are hard to undo, or real ambiguity: ask
  briefly instead of guessing. Small things are decided on the spot and
  recorded in [DECISIONS.md](DECISIONS.md).
- Code quality: small reusable components, no `any`, loading, error and empty
  states everywhere, no dead files.

## Target features

1. **Account:** sign up with email, password and a **unique username** (3–20
   characters, `a-z`, `0-9`, `_`, case-insensitive, availability checked
   live). Sign in, sign out, forgot/reset password, email confirmation. No
   social logins.
2. **Store/home:** all published games in one grid of equal covers; live search by
   title, genre filter (multi-select), engine filter, sorting (newest, A–Z,
   most played).
3. **Library:** every game the user has played, with playtime and "last
   played"; a "Continue playing" row.
4. **Playtime tracking:** time only counts while the player view is open and
   the tab is visible (Page Visibility API). A heartbeat roughly every 30
   seconds calls a Supabase RPC function that caps the seconds per call on the
   server (tamper protection) and adds to the total.
5. **Friends:** find users by username, send a request, accept/decline, remove
   a friend. Friend list; a friend's profile with their playtime per game.
   Only confirmed friends can see playtime.
6. **Profile:** own profile with avatar, username, total playtime, most played
   games; avatar upload.
7. **News:** feed with posts of type `game_update`, `launcher_update` and
   `announcement`: title, date, optional version and linked game, Markdown
   body. A game's page shows that game's patch notes. Posts are Markdown
   files in `news/`.
8. **Content without an admin panel:** games and news are added by committing
   files (decision 22). A draft game (`"status": "draft"`) is only visible
   when running locally.
9. **Parties:** friends form a party in the launcher. When the host starts a
   multiplayer game, everybody is pulled into it; the game gets a shared
   room code and connects the players itself (e.g. PeerJS). Games declare
   `maxPlayers` in `game.json`.
10. **Legal:** `/imprint` and `/privacy` as clearly marked placeholders with
    TODO notes, linked in the footer. No invented legal texts.
11. **PWA:** web app manifest and icons, so the site can be added to the Dock
    in Safari and used like an app.

Everything is free: no payments, no ads, no in-app purchases. The interface is
English only.

## Data model

Games and news are not in the database (see `src/types/models.ts` for their
shapes and `features/games/api.ts`, `features/news/api.ts` for the file
formats). The database holds:

- `profiles`: `id` (= `auth.users.id`), `username` (unique, lower case),
  `avatar_url` (path in the `avatars` bucket, set once), `created_at`
- `friendships`: `id`, `requester_id`, `addressee_id`, `status`
  (`pending`/`accepted`), `created_at`, `accepted_at`; each pair only once
- `playtime`: `user_id`, `game_slug`, `total_seconds`, `last_played_at`;
  primary key (`user_id`, `game_slug`)
- `game_stats`: `game_slug`, `total_seconds` (all players combined, public)
- `parties`: `id`, `host_id`, `game_slug` (running game or null),
  `session_id` (new per game start), `created_at`
- `party_members`: `party_id`, `user_id` (unique: one party per user),
  `joined_at`
- `party_invites`: `id`, `party_id`, `inviter_id`, `invitee_id`, `created_at`

Requirements:

- **Row Level Security on every table** (playtime only for the user and
  confirmed friends; profiles and game stats readable by everyone).
- Writes that carry logic (playtime, friendships) go through RPC functions.
- A trigger creates a profile automatically on sign-up.
- All SQL changes as numbered, well-commented migration files in
  `supabase/migrations/`. Once a file has been run in Supabase it is never
  edited again; changes go into a new file.
- TypeScript types for the database live in `src/types/database.ts` (written
  by hand). The app-level shapes in `src/types/models.ts` use camelCase;
  database rows get mapped to them in the query functions.

## Phases

### Phase 3 – Supabase: database and accounts

- Migrations (tables, RLS, triggers, RPC functions).
- Supabase client, auth context, protected routes.
- Pages for sign-up (with live username check), sign-in, forgot and reset
  password.
- Games and news are read from files in the repository instead of mock data.
- **Step-by-step guides** for the developers: Supabase setup, adding a game
  and a news post.

### Phase 4 – Playtime, library and profile

- Playtime tracking in the player (heartbeat, Page Visibility, server-side
  cap). Total playtime per game comes from `game_stats`.
- Library and "Continue playing" on real data; "Most played" sorting.
- Profile page with statistics. (The avatar upload is already done, see
  decision 24.)

### Phase 5 – Friends

- User search, send/accept/decline requests, remove friends.
- Friend profiles with playtime; friends' playtime on the game page.
- Badge for open friend requests.

### Phase 6 – Content guides and engine notes

- Extend `docs/ADDING-A-GAME.md` with a section for **Unity WebGL exports**
  (set compression so it works on static hosting, e.g. "Disabled" or
  "Decompression Fallback") and notes for HTML5 and Godot exports.
- Image guidance: sizes and formats for covers, banners and screenshots.
- The first real game is in (`wpm-trainer`); check the whole path from
  folder to store once more with a game that has screenshots.

### Phase 7 – Polish and deployment

- PWA (manifest, icons), meta tags/Open Graph, 404 page, imprint and privacy
  placeholders.
- Performance (lazy loading of routes and images), accessibility, responsive
  check.
- A GitHub Actions workflow that pings Supabase regularly so the free project
  is not paused for inactivity (URL and key as GitHub secrets).
- **Deployment guide** for Cloudflare Pages: two projects (launcher and games)
  from the same repository, build settings, environment variables, Supabase
  redirect URLs.
- Final README update.
- Final report: what is done, known limitations, sensible next steps.

### Phase 8 – Parties and multiplayer

- Parties in Supabase (`0006_parties.sql`): create, invite friends, accept or
  decline, leave (host passes on), start and stop a party game. Realtime
  updates plus a 20-second refresh as a fallback.
- Own page `/party` ("Party" in the sidebar, with stacked member pictures):
  members marked as host or member, invitations, kick and "make host" for
  the host (`0007_party_host_tools.sql`). Games are started from the game
  page ("Play with party"). Notices on
  every page for invitations and a running party game. Badge for
  invitations on "Party".
- Game page: "Play with party" for the host, a hint for single player games.
- The player passes room code, role and name to the game (`#party=...`).
- `docs/PARTY-GAMES.md`: what a game needs to support parties.
- Possible next step: a TURN server if direct connections fail too often.

## Open points carried forward

- The built-in Supabase email service only sends a few emails per hour. A
  real SMTP provider is needed before going public (phase 7).
- `brand.contactEmail` is still the placeholder `contact@example.com`.
- The tab title in `index.html` is currently a fixed text instead of the
  `%BRAND_NAME%` placeholder, so it does not follow `src/config/brand.ts`.
- Fullscreen in the player and Safari in general have not been tested yet.
- The WPM trainer loads YouTube videos inside the sandboxed player. Check
  once with a real link that videos play.
- Route-level lazy loading is still to do (the bundle is one large chunk).
- `eslint-plugin-jsx-a11y` can be added once it supports ESLint 10.
