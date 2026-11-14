# Roadmap

The plan for the prototype: what we are building, in which order, and where we
are. This file is the reference for every work session. Update the status
table whenever a phase is finished.

## Status

| Phase | Topic                                | Status   |
| ----- | ------------------------------------ | -------- |
| 0     | Review and plan                      | Done     |
| 1     | Project foundation and GitHub basics | Done     |
| 2     | App shell and interface on mock data | Done     |
| 3     | Supabase: database and accounts      | Done     |
| 4     | Playtime, library and profile        | **Next** |
| 5     | Friends                              | Open     |
| 6     | Content guides and engine notes      | Open     |
| 7     | Polish and deployment                | Open     |

### Where things stand

- **Games and news are files in the repository**, not database rows
  (decision 22). A game is a folder `games/<slug>/` with a `game.json`
  (store entry), an optional `description.md` and its images. A news post is
  a Markdown file in `news/`. Adding content is one commit; see
  [ADDING-A-GAME.md](ADDING-A-GAME.md). **There is no admin panel.**
- **Accounts are real** (Supabase): sign-up with unique username, sign-in,
  sign-out, forgot and reset password. Setup:
  [SUPABASE-SETUP.md](SUPABASE-SETUP.md).
- The database schema for all phases is in `supabase/migrations/`: profiles,
  friendships, playtime, game stats, avatar storage, RLS and the RPC functions
  `record_playtime`, `send_friend_request`, `accept_friend_request`,
  `is_friend_of`. Games are referenced by their slug (folder name).
- **The migrations have not been run against a real project by Claude.** They
  were written without a local database. The first run in the Supabase SQL
  editor is the real test; report any error message.
- **Playtime and friends still run on the in-memory mock** (`src/mocks/api.ts`)
  until phases 4 and 5. Those phases only replace query functions.
- Without Supabase values in `.env` the app still starts: the store and news
  work, everyone is a guest, and the account pages point to the setup guide.
- Guests can browse the store, read news and play. Library, friends and
  profile need an account (decision 16).
- **There is no demo content.** Everything starts empty (decision 11).
  `games/` only contains `_template/`, `news/` only `_template.md`.
- `/imprint` and `/privacy` are placeholder pages.
- Testing the player needs at least one game in `games/`. Phase 4 cannot be
  verified without one.

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
2. **Store/home:** all published games; featured/new highlight; live search by
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
9. **Legal:** `/imprint` and `/privacy` as clearly marked placeholders with
   TODO notes, linked in the footer. No invented legal texts.
10. **PWA:** web app manifest and icons, so the site can be added to the Dock
    in Safari and used like an app.

Everything is free: no payments, no ads, no in-app purchases. The interface is
English only.

## Data model

Games and news are not in the database (see `src/types/models.ts` for their
shapes and `features/games/api.ts`, `features/news/api.ts` for the file
formats). The database holds:

- `profiles`: `id` (= `auth.users.id`), `username` (unique, lower case),
  `avatar_url`, `created_at`
- `friendships`: `id`, `requester_id`, `addressee_id`, `status`
  (`pending`/`accepted`), `created_at`, `accepted_at`; each pair only once
- `playtime`: `user_id`, `game_slug`, `total_seconds`, `last_played_at`;
  primary key (`user_id`, `game_slug`)
- `game_stats`: `game_slug`, `total_seconds` (all players combined, public)

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
- Profile page with statistics and avatar upload.

### Phase 5 – Friends

- User search, send/accept/decline requests, remove friends.
- Friend profiles with playtime; friends' playtime on the game page.
- Badge for open friend requests.

### Phase 6 – Content guides and engine notes

- Extend `docs/ADDING-A-GAME.md` with a section for **Unity WebGL exports**
  (set compression so it works on static hosting, e.g. "Disabled" or
  "Decompression Fallback") and notes for HTML5 and Godot exports.
- Image guidance: sizes and formats for covers, banners and screenshots.
- Add the first real game and check the whole path from folder to store.

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

## Open points carried forward

- Sign-up, sign-in and password reset have only been tested without a
  Supabase project (forms, validation, redirects). The real flows need a
  check once the project exists.
- The built-in Supabase email service only sends a few emails per hour. A
  real SMTP provider is needed before going public (phase 7).
- `brand.contactEmail` is still the placeholder `contact@example.com`.
- The tab title in `index.html` is currently a fixed text instead of the
  `%BRAND_NAME%` placeholder, so it does not follow `src/config/brand.ts`.
- Fullscreen in the player and Safari in general have not been tested yet.
- Route-level lazy loading is still to do (the bundle is one large chunk).
- `eslint-plugin-jsx-a11y` can be added once it supports ESLint 10.
