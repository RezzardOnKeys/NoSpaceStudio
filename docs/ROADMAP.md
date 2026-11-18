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
| 7     | Polish and deployment                | Next   |
| 8     | Parties and multiplayer              | Done   |

### Where things stand

- **The first game is in:** `games/wpm-trainer/` (99-Finger WPM Trainer by
  Balls, version 1.5.0), a typing race for 2 players. Playing together works
  **only through a party** in the launcher; the old room codes and invite
  links are gone (decision 33). Started alone it is single player. A thin
  bar at the top of the game holds the video controls (right) and, in a
  party, the members as overlapping pictures (left; a dashed circle while
  the other player is missing, a green ring when the guest is ready; see
  decision 34). The host starts
  each round with "Start round" and can change time, goal and video before
  every rematch. Screen recording was removed on request; PeerJS is shipped
  in the game folder (`vendor/`). Tested by the developers with two real
  accounts and YouTube videos.
- **The second game is in:** `games/blind-drop/` (Blind Drop, version
  1.2.1), a 3D comic bomb duel on a floating island for 2 players, with a
  practice mode against a bot when started alone. The host picks the blast
  size (Small, Medium, Large; radius 1, 2 or 3) and the mode in the lobby:
  Classic (the island shrinks) or Snipe (blast radius 1, fixed island radius
  8, never shrinks, own dark look); decisions 36 and 37. The code is split
  into small files with one job each (decision 38): rules and numbers in
  `config.js`, the referee in `host.js` (with the list of all messages at
  its top) and `bot.js`, the connection in `net.js`, the 3D view in
  `scene.js` + `look.js`, `world.js`, `characters.js`, `effects.js`, the
  menu in `lobby.js`, the HUD in `hud.js`, and `game.js` ties it together.
  three.js and PeerJS are shipped in the game folder (`vendor/`). Tested in
  Chrome with two tabs (both modes, rematch, reload of host and guest) and
  with a simulation of the referee. **Not yet tested in Safari; whether it
  was played through a real party with two accounts is not recorded.**
- **The third game is in:** `games/die-together/` (Die Together, version
  1.0.0, published), a comic first person shooter where every character is
  steered by two people (one mouse, one keyboard), 2, 4, 6 or 8 players
  from a party; with exactly 2 they fight a bot together. Started alone it
  only shows a notice. The plan is [DIE-TOGETHER.md](DIE-TOGETHER.md), the
  choices made while building it are decision 35. The launcher learned
  `minPlayers` and `evenPlayers` in `game.json` for it. Played by the
  developers two against the bot, tested in Chrome with up to 8 tabs, and the rules (hits, lives, reload, walls, round end) with a test
  script. **Not yet tested in Safari and not yet with 4 or more real
  players.** No sound yet.
- **The fourth game is in:** `games/inkwars/` (Inkwars, version 1.4.0,
  published on 2026-11-16), a 3D water fight in
  third person: two sides paint the arena, the side with more painted
  ground after three minutes wins; in "fish form" a player is fast and
  invisible in the own colour. 1 vs 1 from a party, or alone against bots
  (1 v 1 or 2 v 2). It was written by the second developer as a Vite and
  TypeScript project and brought in as plain JavaScript files without a
  build step, laid out like Blind Drop; the party mode was added on the
  way in (decision 39). Version 1.1 (decision 40): direct movement without
  sliding, the guest moves its own character itself, hits with a look back
  for the guest, a trail without gaps to swim behind a shot, shots that
  land at the crosshair. Version 1.2 (decision 41): faster drops, a wider
  trail, a visible knockout; 1.2.1 (decision 42): the trail is made of
  falling drips that paint where they land; 1.3 (decision 43): no trail any
  more, colour only where the water lands, a clean jet; 1.3.1 (decision
  45): no more sky-high shots when looking above the horizon; 1.4: a mouse
  speed slider in the menu, as in Die Together (remembered in the browser). Tested in Chrome: solo against a bot, and a party
  match with two tabs (menu, colours, same painted arena and score on both
  screens, reload of the guest during a match, result, rematch; in 1.1 also
  the guest's movement, swimming behind a shot and a hit by the guest), and
  with test scripts (hits, aim, a party with artificial network delay).
  **Not yet tested: Safari, a real party with two accounts over the
  internet, the mouse inside the launcher.** No sound yet.
- **The fifth game is in:** `games/dust-dash/` (Dust Dash, version 1.2.0,
  published), a cosy first person race in an old wooden hall of 56 x 36 m:
  two players vacuum up 11500 pieces of dust, dirt and sawdust for points
  for four minutes (the dirt is laid out new from a seed in every match),
  walking is slower while vacuuming, and a delivery box drops about every
  35 seconds at a spot that is equally far for both; whoever touches it
  first gets one of four power-ups for ten seconds. 1 vs 1 from a party
  (the host is the referee, the guest moves itself ahead, decision 44) or
  alone against one bot that plays by the same rules. Its interface has
  its own look (a parcel tag as menu, a wooden sign as clock, a receipt as
  result). Version 1.2: a mouse speed slider under "How to" in the menu.
  Version 1.1 (decision 46): a ten-second camera flight through
  the hall when the time is up, showing how much was cleaned, before the
  result. The plan it was built from is [DUST-DASH.md](DUST-DASH.md).
  Tested in Chrome: alone against the bot, a party with two tabs (also a
  reload during a match), and with test scripts (the hall, fair delivery
  spots, power-ups, the bot over full rounds, a party with an artificial
  network delay). **Not yet tested: Safari, a real party with two accounts
  over the internet, the mouse (pointer lock) by Claude, how strong the
  bot feels against a person** (its numbers are under `bot` in
  `config.js`). No sound yet.
- **The sixth game is in:** `games/blockchess/` (Blockchess, version 1.0.1,
  published on 2026-11-18), chess on a raised board in a floating island
  of blocks with twelve hand-made block figures (Village Guard against
  Cave Folk) that walk to their squares. 1 vs 1 from a party (the host is
  the referee and picks the sides, a rematch swaps them) or alone against
  the computer (easy, medium, hard, with undo). It was handed over as a
  ZIP file of a Vite project and brought in as plain JavaScript like
  Inkwars (decision 51): three.js with OrbitControls, chess.js and PeerJS
  in `vendor/`, the computer in a web worker, no sound, no room codes.
  1.0.1: the board could vanish (blue screen) at the end of a game in
  Brave; the pieces are now drawn with far fewer draw calls, and a lost
  3D view comes back by itself or after a reload that keeps the game.
  Tested in Chrome: alone against the computer, a party with two tabs
  (checkmate, stalemate, a draw by repetition, resign by both sides,
  promotion with a choice, castling, rematch, reload of the guest and of
  the host during a game, the guest leaving and coming back), inside the
  launcher's player, and with test scripts (all rules and draws, the
  referee and the guest copy with lost and false messages, whole games of
  the computer at every strength). **Not yet tested: Safari, a real party
  with two accounts over the internet, touch screens.**
- **The seventh game is in:** `games/teleport-snipe/` (Teleport Snipe,
  version 1.0.0, published on 2026-11-18), a one-on-one sniper duel in a
  walled Japanese temple garden: one shot, exactly 1 s reload, every hit
  wins the round, and every shot that misses the opponent teleports the
  shooter to a completely random spot (a soft column of light shows where
  from and where to). First to 3 rounds, slow motion after every hit, no
  time limit. Fast movement with jumping, crouching and sliding, zoom with
  the right mouse button (without zoom a shot spreads up to 7°). 1 vs 1
  from a party (the host is the referee, the guest moves itself ahead and
  is corrected softly, its shots are checked with lag compensation) or
  alone against a bot that plays by the same rules (its numbers are under
  `bot` in `config.js`). Built step by step from
  [TELEPORT-SNIPE.md](TELEPORT-SNIPE.md); every choice is in decision 50.
  Tested in Chrome: alone against the bot, a party with two tabs (also a
  reload of the guest during a match), inside the launcher (store, game
  page), and with test scripts (movement, shots, teleport spots, rounds,
  the bot over many matches, a party with an artificial network delay).
  **Not yet tested: Safari, a real party with two accounts over the
  internet, the mouse (pointer lock) by Claude, how strong the bot feels
  against a person.** No sound yet.
- **The eighth game is being built:** "Millpond" (`games/millpond/`,
  version 0.1.0, draft), the old board game Nine Men's Morris on a cosy
  island in a mill pond: ladybugs against snails on a wooden board, koi in
  the water, a turning water mill, a camera that turns around the scene
  like in Blockchess, and a few extras (mills light up, removed pieces fly
  away or slide into the pond, day and dusk). 1 vs 1 from a party or alone
  against the computer, published as soon as version 1.0 is done. The
  complete plan is in [MILLPOND.md](MILLPOND.md); the choices made while
  building are decision 52. Steps 1 and 2 of 7 are done (version 0.2.0):
  all rules (tested with a script over thousands of whole games), the
  menu, the party connection, and the scene (island, wooden board, pond
  with lilies, reeds and koi, water mill, hills); a game can be played
  alone (the computer still plays random moves) and with two tabs.
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
  Games are started only on their game page (store and library link there).
  In a party nobody plays alone: the host only gets "Play with party";
  members, single player games and games that are too small for the party
  get a grey button with the reason (decision 34). How a game
  supports parties: [PARTY-GAMES.md](PARTY-GAMES.md).
- The database schema is in `supabase/migrations/` (0001 to 0010). Each file
  is run once in the Supabase SQL editor. **0001 to 0008 have all been run**
  in the shared project. **0009** (decision 47) was pushed before it was
  run; the developer was about to run it. If `report_away` is missing in
  Supabase (Database → Functions), it has not been run yet. **0010** (party chat,
  decision 49) is new and not run yet; if the table `party_messages` is
  missing (Table Editor), run it. A new file
  gets the next number and is run once by one developer. Games are referenced by their slug (folder name).
- **Claude cannot test anything that needs an account** (no passwords).
  Playtime saving, the profile picture upload and all party flows are only
  checked by typecheck and as a guest; the developers test them with their
  two accounts. The game's party connection itself was tested with two
  browser tabs.
- Without Supabase values in `.env` the app still starts: the store, news
  and games work, everyone is a guest.
- **Online status:** friends see "Online", "Playing …" or "Offline · last
  seen …" (dot on the avatar, text in lists and on the profile, "N online"
  next to Friends). There is deliberately no way to appear offline
  (decision 30). Since decision 47 "online" means really using it: a tab
  in the background for 30 seconds, five minutes without input (in a game:
  without the window in front) or a closed tab count as offline at once.
- **Party chat** (decision 49): members of a party write short messages
  to each other on the Party page (migration `0010`).
- **Parties tidy up themselves** (decision 47): whoever is offline for more
  than three minutes leaves their party (as host the role passes on). New
  invitations and a crown for a new host float over every screen,
  including a running game (migration `0009`, see below).
- **Imprint and privacy policy are written** (English, `legal/*.md`). Name,
  address and contact email are still
  `[TODO]` placeholders; the pages show a warning until they are filled in.
  Sign-up requires confirming a minimum age of 16.

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
- **Every change players notice gets a news post** in the same step
  (launcher update or game patch note, with version and the current time;
  rules in [CLAUDE.md](../CLAUDE.md), section "News posts").

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
10. **Legal:** `/imprint` and `/privacy` with real texts from `legal/*.md`; the
    developers' personal details are filled in before going public. Until then
    clearly marked placeholders with
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
- Performance (lazy loading of images), accessibility, responsive check.
  Pages are already loaded on demand (decision 48).
- **Show the UI kit (`/dev/ui`) only in development:** register the route
  only when `import.meta.env.DEV` is true, so the public site does not
  have it. Locally (`npm run dev`) it stays as it is.
- **Cloudflare `_headers` files** for both projects, once the real
  addresses of launcher and games are known:
  - Caching: files in `assets/` (their names contain a hash) may be kept
    for a year; `index.html` is always fetched fresh. Game files have no
    hash in their names, so they only get a short check with the server
    (otherwise players would keep an old game after an update, and host
    and guest could run different versions).
  - Security: only the launcher may embed the games (`frame-ancestors`),
    nobody may embed the launcher, and a Content-Security-Policy that
    lists Supabase (also its realtime connection), the games origin and
    profile pictures. The games need YouTube (WPM trainer) and the PeerJS
    server. Start with `Content-Security-Policy-Report-Only`, play
    everything once on the live site, and only switch it on when the
    browser console shows no warnings.
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
  page ("Play with party"). Invitations and a crown for a new host float
  over every screen, also in a running game (`PartyAlerts`); a box above
  the regular pages offers invitations put aside and a way back into a
  running party game. Badge for invitations on "Party".
- Offline members (more than three minutes) leave their party
  automatically (`0009_active_status_and_party_cleanup.sql`, decision 47).
- Party chat on the Party page (`0010_party_chat.sql`, decision 49): text
  messages for the members, kept until the party ends (at most 24 hours).
- Game page: "Play with party" for the host, a hint for single player games.
- The player passes room code, role, name and the link to the profile
  picture to the game (`#party=...`).
- `docs/PARTY-GAMES.md`: what a game needs to support parties.
- Possible next step: a TURN server if direct connections fail too often.

## Ideas for later

Collected in conversations with the developers; nothing decided yet.

- **Blind Drop follow-ups** (the game itself is built, see above): more than
  two players (free-for-all; raise `MAX_PLAYERS` in `config.js` and
  `maxPlayers` in `game.json`, then test; the lobby text "1 vs 1" and the
  spawn circle are the only places written for two), sound effects, touch
  controls for phones, a smarter bot, a score over several matches, maybe a
  round limit or a slowly growing blast for Snipe if matches feel too long.
- **Die Together follow-ups** (the game itself is built, see above): sound
  effects (Web Audio, as planned), comic stars on a hit, screen shake on a
  hit (respecting reduced motion), a smarter bot, a score over several
  rounds, spectating through the eyes of a character that is still alive.
- **Inkwars follow-ups** (the game itself is built, see above): 2 v 2 in a
  party (the rules already know two seats per team; menu, messages and
  `maxPlayers` are written for 1 vs 1), sound effects, touch controls, not sending a submerged
  player's position to the other screen, a second arena.
- **Dust Dash follow-ups** (the game itself is built, see above): more
  players and more bots (players are a list, the limit is `MAX_PLAYERS`),
  more halls, sound, drawn icons for the power-ups,
  sending the dust film to a guest who reloads.
- **Teleport Snipe follow-ups** (the game itself is built, see above):
  a mode where zooming in shows the opponent what you see, sound. (The
  open line of sight between the start points stays on purpose,
  decision 50.)
- **Other game ideas discussed on 2026-11-17 and set aside** (not
  decided): "Blend In" (hide among identical bots on a market square, tap
  or shoot the other player), a competitive zombie hunt on a farm
  ("Headcount": most zombies in 5 minutes, level-up cards with upgrades or
  sabotage).
- **Other 3D ideas from the brainstorm** (not decided): "Other Eyes" (you
  see through your opponent's eyes), a time loop duel (your previous rounds
  play along as clones), "Echo" (dark arena, sound makes it visible),
  crumbling floor, a body swap duel, a parkour coin race seen from the
  opponent's position.
- **Other game ideas:** drawing and guessing ("Doodle Dash", 3–8 players),
  quiz, memory duel, reaction mini games.
- **Classic board and party games in our own look** (discussed on
  2026-11-18, like Blockchess; only traditional games that belong to
  nobody, always with our own name, look and texts, never the name or look
  of a commercial edition): draughts, Go, backgammon, Reversi, four in a
  row (own name), Pachisi, snakes and ladders, mancala, a ship hunt on a
  grid (own name), dots and boxes, dice poker and bluff dice (not the
  names of commercial editions), Halma and Chinese checkers, finding pairs
  (not called "Memory", which is a trademark), drawing and guessing,
  werewolf/mafia with own roles. Nine Men's Morris is planned as
  Millpond.
- **Launcher ideas:** leaderboards per game (games report a score),
  achievements, a "delete my account" button (the privacy policy
  promises deletion on request by email).

## Open points carried forward

- The built-in Supabase email service only sends a few emails per hour. A
  real SMTP provider is needed before going public (phase 7).
- `brand.contactEmail` is still the placeholder `contact@example.com`.
- Fullscreen in the player and Safari in general have not been tested yet.
  This includes Blind Drop, Die Together, Inkwars, Dust Dash and Blockchess (3D with
  WebGL), which were only tested in Chrome.
- `eslint-plugin-jsx-a11y` can be added once it supports ESLint 10.
