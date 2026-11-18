# Decisions

Short records of decisions that are not obvious from the code. Newest at the
bottom. Add an entry whenever we deviate from the original plan or choose
between real alternatives.

## 1. The launcher lives in the repo root

**Decision:** The Vite app sits in the repository root instead of `apps/web/`.

**Why:** We have one app and one folder of static games. A monorepo layout
would add workspace tooling without any benefit. Cloudflare Pages can still
build two projects from this repo: the launcher (build output `dist/`) and
the games (folder `games/`, no build step).

## 2. Tailwind CSS v4 with CSS-first tokens

**Decision:** All design tokens are defined in `src/styles/index.css` inside
`@theme`. Tailwind's default colour palette is reset.

**Why:** Tokens are plain CSS variables, usable in utilities and in custom CSS
alike. Resetting the palette makes it impossible to accidentally use a colour
that is not part of the design.

## 3. Accent colour: electric violet

**Decision:** `#7c5cff` as the single accent hue, with `#6d4aff` as the solid
button fill and `#a594ff` for accent-coloured text on dark surfaces.

**Why:** It stands apart from the white of the Epic launcher and the blue of
Steam. The darker fill is needed because white text on `#7c5cff` narrowly
misses the WCAG AA contrast ratio of 4.5:1; on `#6d4aff` it passes.

## 4. Inter, self-hosted

**Decision:** The Inter variable font is bundled via `@fontsource-variable/inter`.

**Why:** No request to Google Fonts means one less third party to cover in the
privacy policy, and the font also works offline.

## 5. `motion` instead of `framer-motion`

**Decision:** We install the `motion` package and import from `motion/react`.

**Why:** Framer Motion was renamed to Motion. It is the same library by the
same authors; `motion` is the package that receives updates.

## 6. Native `<dialog>` for modals

**Decision:** `Modal` wraps the browser's `<dialog>` element.

**Why:** Focus trapping, Escape to close and an inert background come built
in, are accessible by default and need no extra dependency.

## 7. Brand name injected into index.html at build time

**Decision:** `index.html` contains `%BRAND_NAME%` style placeholders that a
small Vite plugin fills from `src/config/brand.ts`.

**Why:** The name must be changeable in one place. Without this, the page
title and meta description would be a second place to edit.

## 8. MIT license

**Decision:** The repository is public under the MIT license.

**Why:** It is the simplest permissive license. Note that it currently covers
everything in the repo, including the games in `games/`. If a game should not
be freely reusable, give its folder its own license file.

## 9. No `eslint-plugin-jsx-a11y` for now

**Decision:** The accessibility lint plugin is not installed.

**Why:** At setup time it did not yet support ESLint 10. Accessibility rules
are enforced by convention (see CLAUDE.md) until it does.

## 10. TanStack Query as the data layer

**Decision:** All data access goes through TanStack Query hooks in
`features/<feature>/queries.ts`.

**Why:** It gives every view loading, error and cached states without
hand-written plumbing. It also lets the interface be built against mock
functions first: moving to Supabase only replaces the query functions.

## 11. The catalogue starts empty

**Decision:** There are no demo games, demo news, demo playtime or demo
players. `games/`
only contains `_template/`, the starting point for a new game. This replaces
the earlier approach of eight mock entries with generated artwork.

**Why:** The platform should show only what we really publish, so we fill it
ourselves, entry by entry. Every page has an empty state for this. How to
add entries: decision 22.

## 12. (withdrawn)

Mock entries pointing to the template no longer exist; see decision 11.

## 13. iframe sandbox for games

**Decision:** Games are embedded with
`sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-orientation-lock"`
and `allow="fullscreen; gamepad; autoplay"`.

**Why:** `allow-same-origin` is needed so a game can use its own storage (save
games, Unity's asset cache). This is safe only because games are served from
a different origin than the launcher, so "same origin" never includes the
login session. Popups, top-level navigation, forms and downloads stay blocked.

## 14. Store filters live in the URL

**Decision:** Search text, genres, engine and sorting are query parameters
(`/?q=drift&genre=Arcade&sort=az`).

**Why:** A filtered view can be shared and survives going to a game and back.
The search field in the top bar writes the same parameter, so it works from
every page.

## 15. Tab bar instead of sidebar on small screens

**Decision:** Below the `lg` breakpoint the sidebar is replaced by a bottom
tab bar.

**Why:** A fixed sidebar takes too much width on phones and tablets, and a
bottom bar is within thumb reach.

## 16. Guests can browse and play

**Decision:** The store, game pages, news and the player work without an
account. Library, friends and profile redirect guests to the sign-in
page and bring them back afterwards.

**Why:** "No downloads" should also mean no hurdle before the first game.
Playtime only counts for signed-in players, which is the reason to sign up.
The rule lives in one place (`RequireAuth` in the router) and is easy to
change.

## 17. Usernames are stored in lower case and cannot be changed

**Decision:** The database only accepts `^[a-z0-9_]{3,20}$`. The sign-up form
lower-cases the input. Users may change their avatar and nothing else on
their profile; this is enforced with column-level privileges, not only RLS.

**Why:** Lower case makes names case-insensitive without an extension, and
profile links (`/u/name`) stay stable. Column privileges make it impossible
to write any other column, whatever a policy allows.

## 18. The profile is created by a database trigger

**Decision:** The sign-up form sends the username as user metadata. A trigger
on `auth.users` creates the profile row in the same transaction. If the name
is taken, the whole sign-up fails.

**Why:** There can never be an account without a profile or a profile without
a unique name, even if two people pick the same name at the same moment.

## 19. Database types are written by hand

**Decision:** `src/types/database.ts` mirrors the migrations by hand instead
of being generated with the Supabase CLI.

**Why:** Generating needs the CLI and a login, one more tool for a small
schema. The cost: the file must be updated together with every migration.

## 20. The app runs without Supabase values

**Decision:** If `.env` has no (or only the example) Supabase values, no
client is created. Everyone is a guest, the store and news still work, and
the account pages name the missing values and the setup guide.

**Why:** A fresh clone should start and explain itself instead of crashing
with a blank page.

## 21. Total playtime per game is a public counter

**Decision:** The table `game_stats` holds one running total per game.
Only `record_playtime()` adds to it; nobody can write it directly.

**Why:** "Most played" needs a number everyone may read, while the playtime
rows themselves are private. A counter avoids a public aggregate over private
data.

## 22. Games and news are files in the repository, there is no admin panel

**Decision:** A game is a folder `games/<slug>/` with a `game.json` (store
entry), an optional `description.md` and its images. A news post is a
Markdown file in `news/`. Vite collects them at build time
(`import.meta.glob`). The database has no games or news tables, no `is_admin`
flag and no image storage for games; it identifies a game by its slug. This
replaces the planned admin panel and the short-lived Supabase catalogue.

**Why:** A new game needs a push anyway (its folder). With the store entry
next to it, adding a game or a post is a single commit that can be reviewed,
reverted and written by Claude. It removes a whole phase of work (admin
forms, image upload, admin-only RLS). The price: every content change needs a
push, and the database cannot check that a slug belongs to a real game.

## 23. Drafts and future posts only show locally

**Decision:** A game with `"status": "draft"` and a news post dated in the
future are visible with `npm run dev`, but not in a production build.

**Why:** It gives us a preview without a separate preview system. Note that a
draft game's folder is still deployed and reachable by its direct URL, and
the text of hidden entries is part of the shipped bundle. Hidden is not secret.
A news post about a draft game is hidden on the live site as well, until the
game is published (added with Die Together, so a patch note can be written
while the game is still being tested).

## 24. A profile picture can be chosen only once

**Decision:** Users pick a profile picture once and cannot change or remove
it afterwards. The database enforces it: the file always has the path
`<user id>/avatar`, storage allows inserting it but not updating or deleting,
and `set_avatar()` only fills `profiles.avatar_url` while it is empty. The
column now holds the storage path, not a full URL.

**Why:** The developers want it that way. Enforcing it in the database (not
only by hiding the button) makes it hold against tricks. Storing only the
path means the column can never point to an image on another website.
Removing a picture is possible by hand in the Supabase dashboard
(docs/SUPABASE-SETUP.md).

**How:** The picture is cut to a square and shrunk to 512 × 512 pixels WebP
(JPEG where the browser cannot write WebP) on the device before the upload.

## 25. Parties live in Supabase, game traffic stays in the game

**Decision:** The launcher organises parties in Supabase (tables `parties`,
`party_members`, `party_invites`, changes only through functions). When the
host starts a game, a new `session_id` is written; every member's launcher
notices it (Realtime, plus a refresh every 20 seconds) and opens the game. The
game gets room code, role and name after `#` in its address and connects the
players itself, e.g. with PeerJS.

**Why:** The launcher cannot know how each game exchanges data, and fast
game data should not go through our database (latency, free tier limits).
Passing the details in the address works for every kind of game, needs no
messages between launcher and game, and the game still works on its own.
Format and requirements: docs/PARTY-GAMES.md.

## 26. Only the host pulls the party into a game

**Decision:** Only the host can start a game for the party. Members are
pulled in only when the session changes while their launcher is open; after
a reload they get a "Join game" notice instead. When the host leaves the
player, the party game is stopped.

**Why:** It avoids surprise jumps into a game that was started earlier, and
makes it clear who decides. A running game is never reloaded because the
party changed.

## 27. Third-party code of a game is shipped in its folder

**Decision:** The WPM trainer loaded PeerJS from unpkg.com at runtime. It now
ships `vendor/peerjs.min.js` (same version, 1.5.4, MIT license file next to
it). YouTube is still loaded from YouTube, because it cannot be otherwise.

**Why:** A game should not depend on a third-party CDN being up, and the
version cannot change under us.

## 28. Games declare their player count; screen recording is not offered

**Decision:** `game.json` has an optional `maxPlayers` (default 1). The
player's sandbox stays the same for every game. The WPM trainer's screen
recording was removed: it would have needed downloads and screen capture in
the sandbox.

**Why:** The developers did not want the recording. Keeping one sandbox for
all games keeps decision 13 simple.

## 29. Party gets its own page; no featured banner in the store

**Decision:** The party has its own sidebar entry and page (`/party`)
instead of a box in the library. Next to "Party" in the sidebar, the
members' pictures are shown stacked, so it is visible on every page who is
in the party. The host can kick members and pass the host role on
(`0007_party_host_tools.sql`). The store has no featured banner anymore:
every game is one cover in the same grid, and the `featured` field in
`game.json` is gone.

**Why:** The developers want the party always in view and the store to look
uniform, with all covers the same size.

## 30. Online status through a database heartbeat, visible to friends only

**Decision:** The launcher calls `report_status()` every 30 seconds with the
game that is open. `friend_statuses()` decides in the database who is online
(last report less than 75 seconds ago), so wrong clocks do not matter. Only
confirmed friends can read a status. There is no "appear offline" option:
the developers decided that everybody's status is visible to their friends.

**Why:** Supabase Realtime presence would be instant, but every signed-in
user could see everybody else on the channel. The table keeps the friends
rule in one place (RLS) and also gives "last seen". Going offline shows up
after at most 75 seconds, which is fine for a friend list.

## 31. Legal texts are Markdown files, in English

**Decision:** Imprint and privacy policy live in `legal/imprint.md` and
`legal/privacy.md` and are rendered by `/imprint` and `/privacy`. `{{brand}}`
and `{{email}}` are filled in from `src/config/brand.ts`. Missing personal
details are written as `[TODO: …]`; the page shows a warning while one is
left. The texts are English like the rest of the site. Accounts require a
confirmed minimum age of 16, recorded as `age_confirmed` in the user
metadata.

**Why:** The developers can update the texts without touching code, and an
unfinished page cannot go unnoticed. The texts were drafted by Claude and are
not legal advice.

## 32. Blind Drop: the host is the referee, three.js is shipped unminified

**Decision:** In Blind Drop only the party host's browser runs the rules
(`games/blind-drop/host.js`): timers, hits, shrinking, teleporting. Every
screen, including the host's own, only reacts to the referee's messages and
sends back its inputs and position. While opponents are invisible the
referee sends no positions or bombs at all; they go out only in the "look"
phase (everyone is visible anyway) and in the reveal. Practice mode uses the
same referee in the own browser with a bot as second player. Players are a
list everywhere; the limit of 2 is one number (`MAX_PLAYERS` in `config.js`)
plus `maxPlayers` in `game.json`.

Rules that the idea left open: a player is hit when their centre is inside
any blast, their own included. Whoever is not hit wins; if nobody is left it
is a draw. The bomb can be aimed anywhere on the island with the mouse. The
blast radius is a fifth of the starting diameter and never changes. The
island loses 1.1 of its 10 units of radius per round without a hit, down to
3.4, which is smaller than a blast, so a match cannot go on forever.
(Changed in version 1.1: the host now picks the blast size, see decision 36.)

three.js 0.187.0 is shipped as the two original files `three.module.js` and
`three.core.js` (about 2 MB before compression) with its MIT license, as
decision 27 asks. That version no longer comes with minified files, and we
did not minify it ourselves.

**Why:** One referee means two browsers can never disagree about a hit, and
a guest cannot find the invisible opponent with browser tools because the
data is not on their computer. The price: the host could cheat (their
browser knows everything), which is acceptable among friends. Unmodified
library files can be compared with the official release at any time;
Cloudflare compresses them on the way to the player.

## 33. WPM trainer: multiplayer only through the party; games get the avatar

**Decision:** The WPM trainer no longer has its own "Create room / enter
code / copy link" controls, and `?room=CODE` links no longer work. Two
players race only when the launcher starts the game for a party. The
launcher now also passes a public link to the player's own profile picture
(`avatar` after `#`); the players send name and picture to each other when
they connect, so the game can show the party as overlapping pictures like
the launcher does. During a round the opponent's speed is not shown. After
a round both return to a lobby, where the host may change the settings
before starting the next round.

**Why:** The developers want one way to play together, the party. Two
parallel ways (party and room codes) confused players. Showing the live
speed of the opponent was distracting. The picture link is public anyway
(Supabase storage), so passing it to the game reveals nothing new; the game
accepts only plain `https://` links before showing one.

## 34. Games start only on their page; in a party nobody plays alone

**Decision:** The store cards and the library (cards and list) no longer
have play buttons; they open the game page, which is the only place that
starts a game. In a party (more than one member) the host only gets "Play
with party". The button is greyed out, with the reason below it, for
members ("Only the party host can start games."), for single player games
and for games with a smaller `maxPlayers` than the party. The WPM trainer
moved its video controls and its party pictures into one thin bar at the top
of the game (pictures left, controls right); the player bar of the launcher
keeps its "Party" badge. For a short time the launcher showed the pictures
in its own bar, but right above the game's bar they were shown twice.

**Why:** A play button on a card started the game alone, and the party did
not come along, which surprised the developers. A party is for playing
together. The pictures and video controls stay inside the game (not in the
launcher's bar) because the game runs on another origin by design (decision 13); the
launcher should not need to know how a single game works (decision 25).

## 35. Die Together: built like Blind Drop, with these choices

**Decision:** Die Together (`games/die-together/`) follows the plan in
[DIE-TOGETHER.md](DIE-TOGETHER.md) and decision 32: the party host's browser
is the referee (`host.js`), sends the state of all characters 20 times per
second and judges every shot. The launcher learned two optional fields in
`game.json` for it: `minPlayers` and `evenPlayers` (see
[PARTY-GAMES.md](PARTY-GAMES.md)). Where the plan left things open, we
chose:

- **Menu:** all four team cards are always shown; clicking your own seat
  stands up again. The game only knows the player's own name and the party
  size, so for people who are still loading it says "Waiting for 1 more
  player…" instead of their name. With exactly 2 people the bot sits on the
  last free team and moves aside when somebody takes that seat.
- **Mouse speed:** a slider in the menu, remembered in the browser. The plan
  did not ask for it, but mice and trackpads differ a lot.
- **Body and movement:** a character is an upright cylinder (radius 0.45,
  height 1.6). Edges up to 0.35 are walked up (ramps), a jump reaches about
  1.4, so low crates (height 1) can be jumped on and high ones (2) cannot.
- **Map:** one quarter of the arena is laid out by hand and repeated in all
  four quarters, so every start corner has the same cover. An obstacle
  starts to sink when a closing wall is 2.5 units away and is gone at 1
  unit, so nobody is squeezed between wall and obstacle.
- **Shots:** all shots that arrive between two ticks of the referee are
  judged together and lives are taken afterwards, so two characters can
  lose their last life at the same moment (a draw). A hit makes the
  character blink; the hit player also sees a short red frame.
- **Out and watching:** a character that is out (or lost one of its two
  players) bursts into confetti; its players watch the arena from above.
  Somebody who connects during a round watches until it ends.
- **The bot:** walks between cover spots (towards the middle while it has
  not seen anybody), turns at a limited speed, waits 0.7 to 1.3 seconds
  after spotting the players, aims up to 0.12 radians off and keeps away
  from the walls. All its numbers are in `config.js` (`BOT_…`). It was made
  weaker after the first test by the developers.
- **Reload and empty magazine:** unlike the plan, both players of a
  character see the reload ring around the crosshair, and both see their
  bullets flash red and shake when the mouse player clicks with an empty
  magazine. The developers asked for it after the first test.
- **Hidden host tab:** the referee's clock runs in a small Web Worker
  (`ticker.js`), because browsers slow normal timers of hidden tabs down to
  about one per second. In the menu it also sends a sign of life every 2
  seconds, so guests do not think the host left.
- **Hits on moving targets:** every screen shows the others about 60 to 150
  ms late (network and smoothing). A shot carries the moment the shooter
  saw (`seen`, on the referee's clock), and the referee checks it against
  where everybody was at that moment, at most 350 ms back
  (`REWIND_MAX_MS`). Without this, a perfectly aimed shot at a running
  character often missed. The price: somebody who just ran behind cover can
  still be hit for a fraction of a second, which is common in shooters.
- **Not built yet:** sound, comic stars and screen shake on a hit. The
  developers asked to add sound later, together with Blind Drop.

**Why:** The same model as Blind Drop keeps the two games easy to compare
and means the screens can never disagree about a hit. The choices above
keep a round fair (same cover for everybody, no squeezing, no lucky first
shot decided by network order) and let the developers tune the game by
changing numbers in one file.

## 36. Blind Drop: the host picks the blast size

**Decision:** Before a match the party host (in practice mode: the player)
picks the blast size in the lobby: Small (radius 1), Medium (2, the
default) or Large (3; version 1.0 had one fixed size of 4). The guest sees the
choice but cannot change it. When the host changes it, the guest has to
confirm "Ready" again. The size stays the same for the whole match and is
kept for a rematch. The island still shrinks by 1.1 per round without a hit,
but now down to 85 % of the chosen blast radius (0.85 / 1.7 / 2.55), so a bomb
in the middle always covers the whole island at the end.

**Why:** The developers found the old blast too big. Tying the smallest
island to the blast keeps the promise that every match ends: with Small it
takes about two rounds more until that point, with Large nothing changes.
The sizes were made smaller twice after the developers played with them:
from 2.5 / 3.2 / 4 (1.1.0) to 1.8 / 2.7 / 4 (1.1.1) to 1 / 2 / 3 (1.1.2).

## 37. Blind Drop: second mode "Snipe"

**Decision:** The host picks a mode in the lobby next to the blast size:
Classic (the game so far) or Snipe. In Snipe the blast radius is fixed at 1,
the island has a fixed radius of 8 and never shrinks, so a match has no
guaranteed end; the round counter is the only clock. A round without a hit
ends with "MISSED!" and the next round starts. Bomb and "BOOM!" are the same
as in Classic. The practice bot aims closer in Snipe, otherwise it would
almost never hit.

Snipe has its own look in the same comic style: night sky with a pale moon
instead of the planets, a dark stone platform with rings and a cross painted
on it like the view through a scope, a crosshair for aiming and a dark HUD
with a red accent. The light is almost the same as in Classic on purpose, so
the characters keep their strong colours; the darkness comes from ground and
sky. All differences are in one table (`THEMES` in `world.js`) and applied
by `setTheme()`; the rules differences are in `config.js` and `host.js`.

**Why:** The developers wanted a mode about precise guessing ("sniping")
instead of a shrinking arena, and accepted that it can take long. A
different look makes it obvious at a glance which mode is running.

## 38. Blind Drop: one small file per job

**Decision:** After the modes and blast sizes were added, the two big files
of Blind Drop were split. Each file now has one job and says so in its first
lines:

- `config.js`: every number and rule that can be tuned
- `host.js`: the referee (only in the host's browser); the list of all
  messages is at its top. `bot.js`: the practice bot
- `net.js`: party connection with PeerJS
- `scene.js`: sets up the 3D view and joins `look.js` (comic style),
  `world.js` (lights, sky, island, the two looks), `characters.js` (players
  and name tags) and `effects.js` (puffs, comic words, bombs, explosions,
  aim circle)
- `lobby.js` (menu) and `hud.js` (banner, countdown, result screen): the
  HTML on top of the view
- `game.js`: one player's screen; reacts to the referee, reads the input,
  runs the frame loop and starts everything

The same review fixed four problems: a guest who reloaded could be locked
out as "full" (the guest now asks again for a few seconds); effects piled up
while the tab was in the background (new effects are skipped while no frames
are drawn); the picture went blurry after moving to another monitor (pixel
density is set again on resize); menu buttons were rebuilt on every message
and lost the keyboard focus (they are now built once).

**Why:** `scene.js` had grown to about 820 lines and `game.js` to 470. Small
files are easier for the developers to read and for a new Claude session to
change without breaking something else. Die Together still has the older
layout of a few big files; the same split would fit there.

## 39. Inkwars: brought in as plain JavaScript, party mode with a guest copy

**Decision:** Inkwars was written by the second developer as its own Vite
and TypeScript project (three.js 0.170) and handed over as a ZIP file. It
went into `games/inkwars/` like this:

- **No build step.** The types were stripped from the TypeScript files, the
  result is plain JavaScript with relative imports, one small file per job
  as in decision 38 (the list is at the top of `game.js`). Comments and all
  texts on screen were translated to English. `node_modules`, `package.json`
  and the Vite setup of the ZIP were not taken over.
- **three.js 0.187 from `vendor/`**, the same files as in the other 3D
  games, instead of 0.170. The only thing that had to go is the shadow type
  `PCFSoftShadowMap`, which no longer exists in that version.
- **The test back door is gone.** The ZIP put the whole match on
  `window.__inkwars` (including a way to change the clock). A published game
  does not need that.
- **Party mode, 1 vs 1** (the ZIP only had bots). The party host's browser
  is the referee (`host.js`), as in decisions 32 and 35: it runs the rules
  for both characters. The guest sends keys and aim about 30 times per
  second and gets the state of both characters back just as often
  (`wire.js` packs both). Three things are special:
  - **The painted arena is not sent as a picture.** The host writes down
    every splat (place, size, team and the random number that shapes its
    edge) and sends the list along; the guest repeats the splats exactly
    (`paint.js`, `log` and `apply`). Both screens show the same arena and
    the same score, for a few kilobytes per second. A guest who joins late
    or reloads gets the whole colour mask once, packed as runs of equal
    values (`exportState`).
  - **Water drops fly on both screens.** The host only reports each new
    drop; the guest lets it fly with the same physics, but without painting
    or hitting anything (`sim.authority`).
  - **The guest's own character is shown where the host says it is**, moved
    on a little with its last speed (`guest.js`). The view direction follows
    the own mouse at once; the position lags by the network delay.
    (Changed in version 1.1: the guest now moves its own character itself,
    see decision 40.)
- **Colours:** each player picks one of eight; a colour taken by the other
  is greyed out, and the host goes first if both want the same one. Against
  bots the other side gets the colour furthest away.
- **When somebody leaves:** if the guest leaves during a match, its
  character stands still and the host sees a notice; coming back puts the
  guest into the running match again. If the host leaves, the guest waits
  in the menu. After a match only the host can go back to the menu.
- **Solo keeps both modes of the ZIP** (1 v 1 and 2 v 2 with bots); a party
  match is always 1 vs 1 (`"maxPlayers": 2`).

**Why:** Games here are static folders without a build step (games/README),
and a second three.js version would be one more thing to keep in mind.
Repeating the splats instead of sending the mask keeps both screens equal
without sending 130,000 values again and again. The same referee model as
the other games means two screens cannot disagree about a hit or the score.
The price: the guest feels the network delay in its own movement, the host
does not; and the guest's browser knows where a submerged opponent is, so a
guest could find it with browser tools. Both are acceptable among friends.
The idea of painting ground and diving into one's own colour is known from
other games; name, characters, arena and code are our own, and the store
texts do not refer to any other game.

## 40. Inkwars 1.1: the guest moves itself, hits look back, a trail without gaps

**Decision:** Version 1.1 of Inkwars changes three things in the party
mode and in the shooting. The referee stays the host (decision 39): shots,
hits, life, tank and paint are decided only there.

- **The guest moves its own character itself.** It runs the same rules
  (`Sim.updateActor`) on its exact copy of the painted arena, in the same
  steps of 1/60 s, so a key press shows at once. Every step gets a number
  and its keys (rounded to whole numbers, so both sides compute with the
  same values) go to the host (`feed.js`). The host plays every step of the
  guest exactly once and in order; its copy of the guest's character is
  moved there, not by `sim.step()` (`Actor.external`). The network does
  not deliver evenly, so the host plays two or three steps at once when
  keys pile up and waits a moment when none are there, instead of
  repeating or skipping keys. The host reports the number of the last step
  it played (`k` in the snapshot); the guest compares the place after that
  step with its own and makes up a difference softly within about a
  quarter of a second (`guest.js`), at once if it is more than 2 m, never
  into a wall. In a test with an artificial delay of up to 150 ms each way
  the two places were the same in almost every comparison.
- **Early own paint on the guest.** The guest's own drops fly on its
  screen at once, but their splats come from the host one round trip
  later. So that the guest can swim behind its own shot, those places
  count as its own colour for moving for one second (`useEarly` in
  `paint.js`). Early paint is never drawn and never counted.
- **Hits with a look back.** The guest sees the host's character a little
  late. Every step of the guest carries the moment on the host's clock its
  screen showed (`seen`); the host keeps where every character was in the
  last half second (`Sim.record`, `Sim.poseAt`) and judges the guest's
  drops against where the target was then, at most 350 ms back
  (`REWIND_MAX`), like Die Together (decision 35). In the test, without
  this only 26 to 85 % of the hits the guest saw counted (depending on the
  delay), with it 95 to 100 %. The price: somebody who just ran behind
  cover can still be hit for a fraction of a second.
- **A trail without gaps.** Drips no longer fall every 0.1 s (2.2 m apart)
  but every 0.3 m, as round splats of radius 0.3, on a straight line from
  the shooter's feet in the direction the camera looks, which is where W
  swims. The drop itself flies to the crosshair, a little to the right
  (the camera looks over the right shoulder), and the impact splat joins
  the trail. Drips are sent as small steps in whole centimetres (one entry
  per row of drips), so the party traffic went down a little although
  there are more drips. One shot at 18 m now paints about 12 m² instead of
  6 m²; continuous fire on the spot about 13 % more (the drips
  overlap), fire while walking sideways about 2.5 times as much. The
  developer asked for the wider trail after the first try with radius
  0.22; `dripRadius` in `config.js` is the one number to turn down.
  (Replaced in version 1.3 by colour only where the water lands, see
  decision 43.)
- **Shots land at the crosshair.** The gun now turns in towards the point
  under the crosshair (before every shot landed 0.6 m left of it), the
  drop of the water is worked out exactly instead of estimated (far shots
  fell up to 12 m short, `aimRange` is gone) and the search for that point
  starts right in front of the gun. Spread went down from 0.035 to 0.012.
- **Movement:** on foot accel 70 / decel 80 (stops in 0.08 s instead of
  0.28 s), fish in own water accel 55 / decel 35 (glides 2 m instead of
  11 m), fish on dry ground accel and decel 40 (a leap out of the own water
  no longer skids 8 m), steering in the air 16 instead of 9.

**Why:** The developers felt sliding in the movement and a delay on the
guest's side, and wanted to swim right behind a shot. A guest that moves
itself feels like the host; the host still decides everything that counts.
Playing every step exactly once keeps both sides equal without sending
positions back and forth.

## 41. Inkwars 1.2: faster water, wider trail, a visible knockout

**Decision:** After trying 1.1 the developers asked for three changes:

- **Faster drops:** `speed` 22 → 30 m/s. `gravity` went up from 18 to 32 at
  the same time, so the water still reaches about 28 m and the arena stays
  the same size to play in. Aiming still works it out exactly (decision
  40); the hit and aim tests still pass.
- **Wider trail:** `dripRadius` 0.3 → 0.45 m (0.9 m wide), one drip every
  0.4 m instead of 0.3 m, still without gaps. One shot at 18 m now paints
  about 18 m² (1.0: 6 m², 1.1: 12 m²), continuous fire on the spot about
  22 m² per second (1.0: 15 m²). The party traffic for drips went down a
  little (fewer drips per metre). The arena fills faster, for both sides
  and the bots alike.
- **A visible knockout** (`actorView.js`, only looks, no rule changes):
  when a character goes out it swells up in the opponent's colour for
  0.16 s, bursts into a splash dome, a ring on the floor and a big burst of
  drops, its cap flies off and stays on the floor until it comes back in,
  and "SOAKED!" rises above the spot. The side that did it sees "Opponent
  soaked!" in the middle of the screen. It is driven by the "out" flag
  alone, so it looks the same on the host and the guest. With reduced
  motion the wobble, the spinning cap and the rising word stay still.

**Why:** Before, a character that went out simply disappeared, and it was
not clear whether it was really out. The other two are the developers'
feel after playing 1.1.

## 42. Inkwars 1.2.1: the trail is made of falling drips

**Decision:** Up to 1.2 the trail was painted on the floor right under a
flying drop, whatever its height, and not at all once the drop was more
than 5 m up. Aimed a little upwards, colour appeared where no water came
down, then stopped, and the impact landed far behind after a gap. The
developer asked for colour only where water really lands, without losing
the trail to swim behind.

Now a drop sheds a small drip every 0.4 m of its way (`Sim.drip`). Each
drip is visible, falls down (`dripFallSpeed` 9, `dripGravity` 50) onto its
spot on the straight line from the shooter's feet and paints only when it
arrives (`Sim.updateDrips`, `sim.drips`). There is no height limit any
more, so the line from the feet to the splat is always complete; from a
high arc the drips simply take longer (about 0.4 s from 8 m). Drips in the
first metre land at once: they are under the shooter, and a fish should be
able to start swimming at once. In the browser test a fish that dove right
after the shot stayed in its own colour the whole way, aimed down, level
and up.

The rules did not change otherwise: the host still paints, the guest
repeats the host's splats exactly and only uses its own drips as early
paint for moving (decision 40); every screen shows the drips falling. The
painted area of a shot at the floor is the same as in 1.2; a high shot now
gets its whole trail instead of a broken one.

**Why:** Colour without visible water looked like a mistake, and the gap
made high shots look broken.

## 43. Inkwars 1.3: colour only where the water lands

**Decision:** The trail of 1.1 to 1.2.1 (decisions 40 to 42) is gone. It was
painted on a line in the camera's direction, next to the real flight path,
and in 1.2.1 it was made of small falling drips; aimed upwards that looked
like a wide rain of water under the shot. The developer wanted a shot like
a real water pistol, colour only where the water lands, and to be able to
spray the floor in front and dive in. Now:

- **A drop paints where it comes down**, a splat of radius 1.15 m that is
  longer in the direction of flight the flatter it comes in (up to 1.9
  times as long, `splatStretch`), its middle moved back a little so it
  reaches back along the way the water came (`Sim.impact`). The splat is
  sent to the guest with its direction and length (`paintFloor`, op 0).
- **Water that flies low over the ground** (at most 0.6 m, `skimHeight`)
  colours the ground right under it, one spot every 0.4 m (`Sim.skim`,
  sent like the old drips as small steps in centimetres, op 2). A drop
  high in the air paints nothing on its way.
- **Drops look like a jet:** every drop is drawn stretched along its
  direction of flight (`ProjectileView`).
- Removed: the falling drips (`sim.drips`), the camera direction in the
  input (`lookYaw`) and the precomputed landing point.
- Kept: speed 30 m/s, gravity 32, spread 0.012, exact aiming, the guest's
  own movement and early paint (its own splats count at once for moving),
  hits with a look back.

Measured: a shot at the floor paints 3.6 to 5.6 m² (1.0: 3.6 to 5.9 m²),
continuous fire on the spot about 7 m² per second; the party traffic for
paint went down to about 0.8 KB/s. Spraying the floor 1 to 3 m in front
and diving at once puts the fish in its own colour right away (browser
test). Hits, aiming, the guest's copy of the colour and the look back
passed their test scripts again.

**Why:** Colour without water above it, and a line that does not follow
the drops, looked wrong. Painting only where water arrives is simple and
easy to read.

## 44. Dust Dash: built from its plan, with these choices

**Decision:** Dust Dash (`games/dust-dash/`) is built step by step from
[DUST-DASH.md](DUST-DASH.md), with Inkwars as the template (decisions 38 to
40: one small file per job, the host as referee, PeerJS and three.js from
`vendor/`). This entry collects every choice the plan left open; it grows
with each step.

Step 1 (folder, menu, party connection):

- **Seats instead of teams.** Players are a list; seat 0 is the host (or
  the player alone), seat 1 the guest (or the bot). Scores, colours and
  messages are lists in seat order. The limit is `MAX_PLAYERS` in
  `config.js` plus `"maxPlayers"` in `game.json`.
- **Eight own colours** with warm names (Tomato, Orange, Honey, Leaf, Teal,
  Sky, Plum, Rose). Alone, the bot gets the colour furthest away from the
  player's, as in Inkwars.
- **Version 0.1.0 while it is being built**, no cover yet (the store shows
  the placeholder picture); 1.0.0, cover, banner and the patch note come
  with step 7. Genres: Casual, Party.
- **`guest.js` exists from the start** with the same shape as the referee
  (`start`, `step`, `toMenu`, the clock and the scores), so `game.js` uses
  either without asking which one it has. The guest lets the clock run on
  by itself between two reports of the host.
- **The result card shows at once** when the time is up (Inkwars waits for
  its camera to fly up; Dust Dash has no view from above).
- A guest who reloads after the time is up waits in the menu until the
  host presses "Again", as in Inkwars.

**Why:** Copying what already works in Inkwars keeps the two games alike
for the developers and for later Claude sessions. A list of seats instead
of two fixed teams leaves room for more players and bots later, which the
plan asks for.

Step 2 (hall and walking), added to decision 44:

- **An interface of its own.** The developer found the first menu too close
  to Blind Drop and Inkwars (a white card in the middle). Dust Dash now
  shows its interface as things from the workshop: the menu is a parcel tag
  at the left edge with the hall visible next to it, the colours are paint
  tins, the players are lines on a form, the clock is a wooden sign on two
  cords with a paper tag for each score, notices are paper strips and the
  result is a receipt with a stamped verdict. Typewriter and stencil
  letters from the fonts of the system (nothing is loaded from other
  sites).
- **The hall** is 40 x 26 m and 6 m high, the middle is (0, 0). One half is
  laid out by hand, the other is its point mirror; a big workbench stands
  in the middle. Obstacles are boxes with a kind (`shelf`, `bench`,
  `crates`, `barrel`, `post`); a barrel is drawn round but blocks as a
  square. Start points are 3 m in front of the two short walls, looking at
  the middle.
- **Walking** follows the keys with accel 70 and decel 80 like Inkwars on
  foot. The body is a circle of radius 0.4 m that slides along walls and
  obstacles. The rules run in steps of 1/60 s; the camera glides between
  the last two steps and sways a little while walking (not with reduced
  motion). Eye height 1.55 m, field of view 75 degrees.
- **Until step 5 every player walks only in their own browser.** Nothing
  about the position is sent yet and the other player is not drawn; the
  host still runs the clock for both.
- **Gentle shadows:** obstacles throw a soft shadow from the afternoon sun,
  walls and roof do not, so the hall stays bright.

Step 3 (dirt, vacuuming, points), added to decision 44:

- **Slower while vacuuming:** 4.2 m/s instead of the planned 5, asked for
  by the developer after trying step 2 (`move.vacuumSpeed`).
- **6000 pieces** (`dirt.pieces`), about 40 % dust bunnies, 36 % crumbs and
  24 % shavings. How dirty a spot is comes from simple sums: a little on
  the open floor, more along walls, in corners, around obstacles and
  workbenches, most under workbenches, plus 24 extra dirty spots placed by
  the seed. Shavings lie mostly within 2.5 m of a workbench.
- **Only sums and square roots in `dirt.js`**, and whole-number random
  numbers. Sine and cosine can differ in the last digit between browsers;
  with them two screens could build different pieces from the same seed.
- **Every piece can be reached.** A piece is only placed where a player can
  stand within 1.3 m with a free line to it. Nothing lies inside shelves,
  crates, barrels or posts; under workbenches it does.
- **The nozzle's area** is a strip in front of the player, 1.6 m long and
  1.2 m wide, starting 15 cm behind the player's middle. A piece in it
  belongs to the player at once and counts 1 point at that moment; flying
  into the nozzle (0.1 to 0.2 s, shrinking in the last quarter) is only the
  picture. The vacuum does not pull through shelves, crates, barrels and
  posts, but it does reach under workbenches.
- **The dust film** has 8 values per metre. It is wiped by two soft circles
  along the nozzle's strip. It is drawn by changing the floor's material
  (`film.applyTo`), as Inkwars does for its colour.
- **The own vacuum** is drawn in a second go on top of the hall with a
  fresh depth, so it never sticks into a wall. Pieces fly to the front
  edge of its nozzle.
- **The seed** is a random whole number the host (or the player alone)
  picks at every start; it travels in the `start` message. Behind the menu
  the hall shows the dirt of seed 1, after a match what was left.
- **Still open in the party** (comes with step 5): each browser vacuums its
  own copy of the dirt and counts only its own score.
- **Measured:** two test players that always walk to the nearest piece
  empty the hall of 40 x 26 m in about 2:24, one alone gets 5900 of 6000
  pieces in four minutes. People are slower, but the plan wants that two
  good players do not finish the hall in four minutes. More pieces do not
  help (the time goes into covering the floor, not into the pieces). The
  developer was asked: bigger hall (about 56 x 36 m) or a shorter round.

A bigger hall and step 4 (deliveries and power-ups), added to decision 44:

- **The hall is 56 x 36 m** (the developer chose this over a shorter
  round). Two test players that always walk to the nearest piece now need
  almost the full four minutes; people will not finish it. The layout was
  made new: six shelves, three workbenches, crates, barrels and four posts
  per half, point mirrored, the big workbench in the middle; start points
  3 m in front of the short walls. 11500 pieces (the same 5.7 per square
  metre as before) and 46 extra dirty spots.
- **Walking distances** come from `nav.js`: the floor in squares of half a
  metre, the way around obstacles to every square (no cutting corners).
  One search takes a few milliseconds.
- **A fair spot** for a box: a square with 1.1 m of free room around it,
  at least 9 m to walk for everybody, and the players' ways differ by at
  most 2 m. If no square is that fair, the fairest one is taken. In 300
  random tests the ways never differed by more than 2 m.
- **Timing:** first box after 25 s, it falls for 1.5 s, lies until somebody
  comes within 1.2 m, and the next timer of 35 s starts when it is opened
  (so a box that nobody fetches stops the deliveries). If two players reach
  it in the same step, the closer one gets it. A box can only be opened
  once it has landed.
- **Power-ups** (10 s, a new one replaces the old one): wide nozzle 2.4 m
  wide; turbo shoes 1.45 times as fast (10.2 m/s walking, 6.1 m/s
  vacuuming); strong suction 3.2 m reach and 1.62 m wide; golden nozzle 2
  points per piece. Which one comes is random with equal chances.
- **The icon** shows from the moment the hatch opens, not only when the box
  lies, so both can start running at once. Label top left: "Delivery in
  0:24", "Delivery incoming!", "Delivery waiting!".
- **The power-up card** sits at the bottom left with a round badge and a
  bar; the badges use plain signs instead of drawn icons for now. The
  changed nozzle looks come with step 7, as the order of work says.
- **Still open in the party** (step 5): each browser has its own boxes.

Step 5 (the party mode), added to decision 44:

- **Built like Inkwars 1.1** (decision 40): the host is the referee, the
  guest runs the same walking rules for its own character, numbers every
  step and sends its keys (`feed.js`); the host plays every step once and
  reports the last one (`k`); the guest makes up a difference within about
  a quarter of a second, at once above 2 m, never into a wall. Keys are
  sent as whole numbers (the view direction in thousandths of a radian),
  and the guest walks with exactly those rounded values.
- **Vacuuming is decided where the guest's steps are played**, on the host,
  with the guest's own keys. So the guest gets what was in front of its
  nozzle on its own screen, apart from pieces the host player took first.
- **Early pieces on the guest:** what lies in front of the guest's own
  nozzle flies in at once but does not count. The score always comes from
  the host. An early piece that the host has not confirmed after one second
  is put back on the floor. In the test with 100 to 150 ms delay each way
  that happened to 32 of about 1100 pieces of the guest.
- **What a snapshot holds** (about 30 per second): state and clocks, every
  player (place, speed, view direction, vacuuming, score, power-up), the
  delivery, per seat the pieces taken since the last snapshot (sorted,
  sent as steps from one number to the next), the boxes opened, and `k`.
- **Late join or reload:** the `start` message (with the seed and the
  host's name) and once the list of all pieces that are gone (message
  `dirt`; about 2 bytes per piece). The dust film is not sent; a guest who
  reloads sees dust again where it was wiped. That is only for looks.
- **The other player** (`playerView.js`): a round character with big eyes
  in its colour, a tank on its back, a hose and a nozzle on the floor in
  front. Its picture glides after the reported place, so it never jerks.
  The bot is drawn with the same character.
- **When somebody leaves:** as in Inkwars. The guest's character stands
  still and the host sees a notice; coming back puts the guest into the
  running match. If the host leaves, the guest waits in the menu.
- **Tested with a script** that runs host and guest with a delay of 0, 40
  to 80 and 100 to 150 ms each way for 70 seconds: the scores on both
  sides were equal every time, every box was opened on both sides, a late
  joiner had exactly the same pieces as the host.

Steps 6 to 8 (the bot, polish, publishing as 1.0.0), added to decision 44:

- **The bot** (`bot.js`) presses the same "keys" as a player and walks at
  the same speeds. In this order it: runs for a delivery if its walking
  distance is at most 1.15 times the player's (it notices a box after
  0.6 s, thinks again every 4 s while the box lies there, and stops
  vacuuming while it is more than 7 m away); walks to the nearest piece it
  can see (3 m, nothing solid in between); otherwise walks around the
  obstacles to the area with the most dirt for the way (it knows how much
  is left in every square of 2 x 2 m). It is made beatable by turning
  slowly (2.4 rad/s), a rest of 1.8 s before walking to a new area and a
  breather of 2.2 s after every 5 s of vacuuming. Alone in an untouched
  hall and with every box it reaches 4000 to 4600 points in four minutes;
  without these brakes it reached about 6000. Nobody has played against
  it with a mouse yet, so the numbers under `bot` in `config.js` may need
  tuning. If it does not move for 0.6 s it picks another area.
- **Sunbeams** are faint glowing sides from each front window down to the
  floor plus a bright patch, slanted like the sun in `scene.js`; 520
  specks of dust float near those windows. Both are only for looks and
  are not cut off by obstacles.
- **Nozzle looks with a power-up:** wide nozzle 1.7 times as wide, strong
  suction with a purple glow, golden nozzle golden with a warm glow; turbo
  shoes change nothing on the nozzle. The other player's nozzle shows wide
  and golden too.
- **The own nozzle lies on the floor** (the developer asked for it). First
  it was a model fixed to the camera and drawn on top of everything, so
  it seemed to stick into shelves. Now it is a real object in the hall:
  the head lies 1.05 m in front of the player, a pipe leads to the hand at
  the bottom right, and in front of a wall, shelf, crate, barrel or post
  it is pulled in so it never enters them (`Hall.roomAhead`); it does go
  under workbenches. The other player's nozzle is pulled in the same way.
  Pieces fly to the nozzle on the floor.
- **Cover and banner** are SVG pictures drawn by hand (a small script made
  the scattered dirt): the hall, a cleaner with its vacuum, a clean lane, a
  delivery box in a beam of light and the stamped title.
- **Published as 1.0.0** with `"status": "published"`; the patch note is
  `news/2026-11-16-dust-dash-1-0.md`.

## 45. Inkwars 1.3.1: shots leave the gun at most a little above the crosshair

**Decision:** The gun aims at the spot under the crosshair and works out
the arc that lands there (decision 40). Looking at or above the horizon
the crosshair found no floor within 45 m, so the gun aimed at a point 40 m
away in the air. The water only reaches about 28 m, so it was lobbed at
45 degrees and more and flew sky high (measured: looking just below the
horizon the gun pointed 0.35 rad up, just above it 0.79 rad). The
developer wanted shots above the middle to behave like the ones below.

Now a shot may leave the gun at most `aimLift` (0.42 rad, `config.js`)
above the direction the crosshair looks. If the spot under the crosshair
would need more, the gun aims at the furthest point on the crosshair's
line that it reaches that flat (found by halving the distance 18 times in
`game.js`). Spots that can be reached flatter, which is every spot on the
floor or a wall up to about 20 m, are hit exactly as before.

Measured from the start point: below the horizon nothing changed; at the
horizon the gun now points 0.42 rad up instead of 0.79, and the angle
grows evenly with the view (0.05 rad more view, 0.05 rad more shot). Water
fired at the horizon now flies at most 2.3 m above the gun instead of 7 m.
The price: the furthest spot on flat ground that can be painted while
aiming at it is about 20 m (before 28 m); looking a little higher still
reaches 28 m.

**Why:** A shot that suddenly jumps into a steep lob when the crosshair
moves a few pixels feels broken. Keeping the shot close to the view
direction is what players expect.

## 46. Dust Dash 1.1: a camera flight through the hall at the end of a round

**Decision:** When the time is up, the camera flies through the hall for
ten seconds before the receipt appears (`tour.js`). The developer asked
for a cinematic look at how much was cleaned after every round, explicitly
not a view from above like Inkwars; the plan (`docs/DUST-DASH.md`) had
ruled out a view from above, and that still holds.

- **The way** is laid out by hand as a smooth curve through six points:
  low (1.4 m) near the front left corner, along the sunny front windows,
  up over the middle and to 4.7 m in the back right corner, looking over
  the whole hall at the end. The camera looks at a second curve of points
  on the floor. The flight starts and ends slowly. A test script checks
  that the camera stays inside the hall and at least 0.75 m away from
  every obstacle and post.
- **What is shown:** "TIME'S UP!" at the top and a paper label at the
  bottom that counts up "… % of the hall is clean" and "… of 11,500 pieces
  vacuumed" (both players together; the share is the share of pieces, the
  dust film is only for looks). The characters stay where they stood.
- **Skip:** a click or a new key press skips the flight on that screen
  only; a key still held from the match does not count. The host's
  "Again" button appears only with the receipt, as before.
- **Reduced motion:** three still pictures from the way (about 3.3 s each)
  instead of the flight.
- Host and guest each run the flight on their own screen; nothing new is
  sent over the network.

## 47. Online only while really in use; offline players leave their party

**Decision:** The developer noticed friends who stayed "Online" while their
launcher was only open somewhere in the background, and wanted: online only
while somebody is really in the launcher or a game, leaving the party when
going offline, a visible notice for a new host and invitations on every
screen.

- **What counts as "really here"** (`features/presence/activity.ts`): the
  launcher's tab is visible (or was hidden less than 30 seconds ago, so a
  quick look at another tab changes nothing) and the mouse, keyboard or a
  touch screen was used in the last five minutes. Inside a game the input
  goes to the game's frame on another origin, which the launcher cannot
  see; there a browser window in front with focus counts as being active,
  checked every five seconds.
- **Reporting** (`PresenceReporter`): while active, "I am here" every 30
  seconds as before (`report_status`). When that stops, "I am away" once
  (`report_away`, new), so friends see "Offline" at once instead of after
  75 seconds. Closing or reloading the tab also sends "I am away", with a
  `keepalive` request that survives the closing page. After a reload the
  first report is repeated ten seconds later, in case the old page's
  "away" arrives after it. With several launcher tabs, a tab that goes
  away does not report it while another tab was used in the last 15
  seconds (they share the time of the last input in `localStorage`).
- **Database** (`0009_active_status_and_party_cleanup.sql`): a new column
  `active` in `user_status`; `friend_statuses` counts a friend as online
  only while active and reported in the last 75 seconds (a crashed browser
  still goes offline after 75 seconds).
- **Leaving the party:** every `report_status` call of any player first runs
  `clean_up_parties`, which removes every party member whose last report or
  "away" is more than three minutes old, with the rules of `leave_party`
  (as host the member who joined first takes over and a running game is
  stopped; an empty party is deleted). The three minutes are a grace time
  for reloads, a short look elsewhere and a short loss of connection. It
  runs on reports instead of a timer in the database, so nothing needs to
  be switched on in Supabase. Because it runs before the caller's own row
  is updated, a player who comes back after a long break leaves the old
  party even if nobody else was online in the meantime. The two helper
  functions cannot be called by the website.
- **Party notices on every screen** (`features/party/PartyAlerts.tsx`,
  mounted in `RootLayout`, so also on the player page): cards in the top
  right corner, below the top bar. A new invitation shows with "Join
  party" and "Decline"; the clock button puts it aside, after which it
  waits in the box above the content of the regular pages (`PartyNotices`)
  and in the Party badge. The new host sees a golden crown that hops in
  ("You are now the party host") for seven seconds, whether the host role
  was handed over, or the old host left or went offline. Joining or
  starting a party shows no crown. In the browser's fullscreen mode of a
  game the cards are not visible (only the game's frame is shown there).
- **Not changed:** there is still no way to appear offline (decision 30),
  and the status is still visible to confirmed friends only.

**Why:** A status that says "online" for a forgotten tab is misleading, and
a party with members who left long ago blocks games for the others. The
grace times keep both from flickering during normal use. The price: a
party host who leaves the game's tab in the background for more than
three and a half minutes loses the host role and the game is stopped for
the party.

## 48. Pages load on demand; archives stay out of the repository

**Decision:** Every page except the store is downloaded the first time it
is opened instead of with the first visit (`routes/lazy-page.ts`, used in
`routes/router.tsx`).

- The store stays in the main file because it is the start page; a guest
  who opens the site sees it without a second wait.
- While a page's file downloads, a `<Suspense>` around the page shows
  `PageFallback` (a skeleton) inside the frame: in `AppShell`, in
  `AuthLayout` and, for the player, in `RootLayout`. The sidebar and top
  bar stay visible. Usually this is only a split second, and only the
  first time.
- **After a new release** the file names change. A launcher that was open
  before the release asks for an old file the first time it opens a page
  it has not visited yet. `lib/stale-chunks.ts` catches this
  (`vite:preloadError`) and reloads the page once, which loads the new
  version. If the same happens again within ten seconds, it does not
  reload again but shows the error, so a really broken file cannot cause
  endless reloads.
- Shared code (React, React Router, the Supabase client, icons) is still
  loaded on the first visit; every page needs it. The first visit went
  from 1030 kB to about 820 kB (311 to 251 kB compressed). The biggest
  saving is the Markdown renderer (118 kB), which now loads only on pages
  that show Markdown (game page, news, legal pages).
- `*.zip` is in `.gitignore`. Games are added as unpacked folders; an
  archive in the repository only makes every clone bigger.
  (`inkwars.zip`, 25 MB, was committed with version 43; removing it from
  the current files does not remove it from the git history.)

**Why:** The bundle was one large file, which slows down the first visit,
especially on phones, and grows with every page we add. Splitting it now is
cheaper than later.

## 49. Party chat on the Party page

**Decision:** The developer asked for a text chat for parties that is
visible only in the Party section, and only while you are in a party.

- **Where:** a "Chat" box below the members on the Party page
  (`features/party/PartyChat.tsx`). It does not appear in games, in the
  sidebar or as a floating notice, and there is no unread badge.
- **Who reads what** (`0010_party_chat.sql`): only members of the party,
  and only messages written since they joined. A member who joins later
  does not see older messages; a member who leaves or is removed loses
  access at once.
- **How long:** messages are deleted with their party (also when it ends
  automatically, decision 47). In a long party, messages older than 24
  hours are deleted whenever somebody writes. Messages cannot be edited or
  deleted by hand.
- **Rules in the database** (`send_party_message`): 1 to 500 characters
  (spaces at both ends removed), at most 5 messages in 10 seconds. The
  website cannot insert rows directly.
- **Live updates:** Supabase Realtime tells the page about new messages of
  the own party; the page then loads the newest 100 again. Every 20
  seconds it asks again as a safety net, like the party itself. A failed
  refresh keeps the messages on screen.
- **Display:** messages from the same person within five minutes are one
  block (one picture and name); your own name is coloured; messages of
  people whose account no longer exists show "Former member". The list
  follows new messages only while it is scrolled to the end.
- **No moderation:** parties are small groups formed by inviting friends,
  so there is no filter or report button. The privacy policy asks not to
  share personal data in the chat.

**Why:** Members of a party had no way to talk to each other inside the
launcher. Keeping the chat on the Party page keeps the rest of the
launcher and the games free of it, as requested.

## 50. Teleport Snipe: built from its plan, with these choices

**Decision:** Teleport Snipe (`games/teleport-snipe/`) is built step by
step from [TELEPORT-SNIPE.md](TELEPORT-SNIPE.md). Where the plan leaves
something open, these defaults were chosen (the list grows with every step):

- **Step 1 (menu and connection):** the menu is a wooden prayer plaque on
  a red cord with a red seal next to the title; the six colours are round
  lacquer discs (Vermilion, Amber, Jade, Azure, Wisteria, Plum blossom).
  The host (or the player alone) starts with Vermilion; the other side gets
  the colour furthest away on the colour wheel. The guest presses "Ready",
  the host "Start duel", as in Dust Dash.
- The party connection (`net.js`) and the clock for hidden tabs
  (`ticker.js`) are copied from Dust Dash, with the room name
  `nss-teleport-snipe-<party code>`. three.js r187 and PeerJS are the same
  files as in Dust Dash (`vendor/`).
- The score strip shows the own side left and the opponent right, with
  "First to 3" below; during the countdown a big number counts down.
- A guest who reloads during a match gets `start` again and then the
  current state with the next snapshot.
- **Step 2 (garden and movement):** the garden is built from straight
  boxes only (no rotated ones), so collisions stay simple and exact. The
  layout: raked gravel with five rocks in the middle, the pagoda in the
  north-west (balcony at 3.6 m, eleven stone steps on its east side), the
  tea house in the east (veranda at 1.5 m, four wooden steps from the
  west), a stepped hill of five 0.4 m tiers in the south-west (2 m, bell
  frame on top), the koi pond with a red bridge in the south-east, a torii
  on the south path, three bamboo groves, seven cherry trees, eight stone
  lanterns and six low stone walls (one in front of each start point).
- The body is a square column 0.7 m wide, 1.75 m high (1.15 m crouched);
  the eyes are at 1.6 m (1.0 m crouched). Low stone walls are 1.1 m: a
  crouching player is hidden behind them, and they can be jumped over.
- Steps up to 0.5 m are walked up by themselves; the camera follows steps
  softly so stairs do not jerk. A jump starts only on a new key press
  (holding Space does not keep hopping).
- The slide slows down to crouch walking speed (3 m/s), not to running
  speed: "walking" in the plan was read as walking while crouched. The
  speed stays high at first and drops towards the end; the keys bend it a
  little. One slide per second, counted from the end of a slide. A jump
  out of a slide keeps its speed (the air never slows a player down).
- The pond is filled with invisible blocks beside the bridge, so nobody
  can step or fall into it; they do not block shots or sight. Tree crowns
  and bamboo groves block sight; the railings of the balcony and the
  bridge are solid.
- Players do not bump into each other; the teleport rule (at least 1.5 m
  away) keeps them apart where it matters.
- In a party, each screen moves only its own player until step 5; the
  other player's figure stands at its start point until then.
- **Step 3 (the rifle):** "spread within about 7°" is read as: without
  zoom a shot lands up to 7° away from the crosshair, evenly spread over
  that circle. While zooming in, the spread shrinks with the zoom (none
  when fully zoomed). Zooming is measured in the angle's tangent, so the
  picture grows evenly; the mouse (and the arrow keys) turn the view
  slower in the same measure.
- The first click into the game only catches the mouse and does not
  shoot. A click during the reload is ignored (not saved for later).
- A shot starts at the eyes (the camera) and can hit a body that is a
  little wider (0.84 m) and higher (+0.15 m, the hat) than the body that
  bumps into walls. Tree crowns, bamboo, rocks, walls, railings and roofs
  stop a shot; the invisible blocks over the pond do not.
- The recoil only lifts the picture for a moment; the aim does not move.
  With reduced motion the picture does not jump (the rifle still kicks).
- The own rifle is drawn in its own small scene on top of the garden, so
  it never sinks into a wall, with a sleeve in the coat colour; it works
  the bolt during the reload and is hidden when zoomed in.
- Tracers are a white line in a sleeve of the shooter's colour with normal
  (not glowing) colours, because glowing colours almost vanish against
  the bright gravel.
- Seven straw dummies (map.js) stand around the garden to try the rifle.
  A hit dummy falls over and stands up after 1.5 s. They are removed when
  the bot arrives (step 6). Until step 5 a guest's shots are decided on
  the guest's own screen.
- **Step 4 (teleports and rounds):** the standing spots are worked out in
  `map.js` when the game loads: a 0.75 m grid on the ground and on the top
  of every box marked as standable, keeping only spots where the whole
  standing body fits (about 3500 spots; about 9 % of them are raised).
  Spots in the middle of a staircase step usually drop out, because the
  body would overlap the next step.
- The teleport spot comes from `random.js` (a small "mulberry32" row of
  numbers) started from the match seed, the seat and the number of the
  shot in the match (shots count on across rounds). Spots closer than
  1.5 m to the other player are skipped by taking the next number of the
  same row, so every screen that knows where the other player stands gets
  the same spot.
- After a teleport the player stands still (speed set to zero) and keeps
  the view direction. Hitting a straw dummy counts as a miss (teleport).
- The flash is a soft column of light in the player's colour with a
  white heart and seven whirling petals; it is drawn only from outside,
  so the player who lands inside it is not blinded. With reduced motion
  it is weaker and the petals barely turn.
- The hit player drops at once; their own view sinks to the ground and
  tips a little (not with reduced motion). When the round card appears
  the hit player vanishes in a puff of petals. During the slow motion the
  shooter may stay zoomed in; the tracer of the deciding shot lingers
  because it fades at the slow speed too.
- Tracers always start at the muzzle as it sits in the normal view, also
  for shots fired zoomed in (then they come in from the lower right).
- The round card and the result are hanging paper scrolls; "Again" leads
  back to the menu (as in the other games), where the host or the player
  alone starts the next match.
- **Step 5 (party):** the guest moves its own player at once and sends
  the keys of every step, numbered and marked with the round; the host
  replays them one by one (`feed.js`, the same idea as in Dust Dash,
  written new). The host reports the last step it played; the guest
  compares its own position after that step and makes up a difference
  softly (in a fifth of a second), takes over one above 1.5 m at once
  (for example a teleport it did not expect), and ignores one below 1 cm
  (positions travel rounded to millimetres). Feet can never sink below
  the ground any more: a correction of a tenth of a millimetre had made
  the guest fall through it in a test.
- A guest's shot names the step after which it was fired and the host
  step at which the guest saw the host's player (the guest shows the
  other player 4 steps, about 70 ms, in the past, gliding between two
  reports). The host decides it right after that step, with the other
  players put back to where they were then (at most half a second back).
  A shot that starts more than 2.5 m from where the host has the guest's
  eyes starts at the host's place instead. A reload that has 0.05 s or
  less left on the host is forgiven.
- The guest works its own shot out at once for the feeling: tracer, hit
  marker and the teleport to the seeded spot. The host's answer decides:
  a hit ends the round only when the host says so; if the host disagrees
  about a teleport, the guest is moved to the host's spot by the
  correction above (and sees a flash there).
- The host sends the other player's shots (tracers) and teleports
  (flashes) with every report. A crouching player's figure is lower.
- The host also counts the guest's shots and sends the count, so a guest
  who reloads during a match gets the same teleport spots again.
- Found while building step 5: since step 4 the own hit marker had not
  worked (the shot's answer had changed its shape); fixed.
- **Step 6 (the bot, `bot.js`):** it walks from cover to cover (standing
  spots on the ground within 1.1 m of a wall, rock, lantern, trunk or
  bamboo that hides a body), waits there 0.8 to 2.5 s and looks towards
  where it last saw the player or a flash, else at the middle of the
  garden. It sees only within 110° in front of it and only with a free
  line to the player's head or chest; it notices the player's teleport
  flash where it could see its upper part. After 0.45 s of sight it
  zooms in, turns at 5 rad/s, holds the aim 0.15 s and shoots. Its aiming
  error is 0.35° plus 0.02° per metre plus 0.25° per m/s of the player's
  speed, chosen once per aim. If it does not get anywhere for 0.7 s it
  jumps; after three tries it picks another spot. In simulated matches it
  hit about 60 % of its shots against a player standing still and about
  35 % against one running around, and never got stuck. The straw
  dummies are gone.
- **Step 7 (polish):** petals fall slowly from every cherry tree (one
  instanced mesh, 16 per tree, 6 with reduced motion, recycled when they
  reach the ground); cover and banner are SVG pictures in the garden's
  style; version 1.0.0 is published with one patch note (no separate
  announcement, as with Dust Dash).
- **The start points stay in sight of each other** (decided by the
  developers on 2026-11-18): without the dummies both start points see
  each other across the middle, so a round can be decided in the first
  seconds. That stays on purpose; the middle remains low cover as planned.

**Why:** The plan asks to record every choice made while building. The
proven connection code keeps party matches reliable, and the menu gets a
look of its own that fits the garden, like Dust Dash's parcel tag.

## 51. Blockchess: brought in from a ZIP file, party mode with the host as referee

**Decision:** Blockchess (`games/blockchess/`) was written as its own Vite
project (three.js 0.187, chess.js 1.4.0, PeerJS 1.5.5) and handed over as
`blockchess.zip`, with German texts, a hot-seat mode and its own room codes.
It went in the way Inkwars did (decision 39):

- **No build step, one small file per job** (decision 38); the list of
  files is at the top of `game.js`. The 600-line `main.js` of the ZIP was
  split into `rules.js` (the rules around chess.js), `host.js` (referee),
  `guest.js` (guest copy), `scene.js`, `board.js`, `pieceView.js`,
  `camera.js`, `menu.js`, `hud.js` and `game.js`. `pieces.js`, `world.js`,
  `textures.js` and `ai.js` were taken over almost unchanged (import
  paths and comments). Comments and all texts on screen are English; the
  pieces are called Village Guard (Villager, Stone Golem, Lantern Monk,
  Block Horse Knight, Crystal Mage, Village Elder) and Cave Folk (Bone
  Warrior, Obsidian Colossus, Mushroom Shaman, Spider Rider, Shadow Witch,
  Cave King).
- **Third-party code in `vendor/`** (decision 27) with licence files:
  three.js r187 (the same files as in the other 3D games),
  `OrbitControls.js` from the same three.js version with its import
  pointed at `./three.module.js`, chess.js 1.4.0 (BSD-2 licence; exactly
  this version, because the computer uses its internal functions for
  speed) and PeerJS 1.5.4 (the same file as in the other games instead of
  the ZIP's 1.5.5).
- **The computer runs in a web worker** (`aiWorker.js`), started with
  `new Worker(new URL('./aiWorker.js', import.meta.url), { type: 'module' })`,
  which browsers understand without Vite. If the worker cannot start, the
  computer thinks on the page itself. Strength and thinking time are in
  `config.js`.
- **Not taken over:** `.git`, `node_modules`, `dist`, `.claude`,
  `package.json`, `package-lock.json`, the Vite setup, the test back
  doors `window.blockchess` and `?fast`, `sound.js` (our games have no
  sound for now), the mode "2 players on one device", and the room codes
  and invitation links (`online.js`).
- **Playing together only through the party** (decision 33), exactly 2
  players (`"maxPlayers": 2`). The host's browser is the referee: it
  holds the moves and the result (`host.js`, all messages at its top).
  The guest checks its own move with the same rules and shows it at once,
  then sends it; the host plays it only if it is that side's turn, the
  half-move number fits and the move is legal, and confirms it. Otherwise,
  or if the guest misses a message, the guest gets the whole game again
  (`game` message, the list of moves) and starts over from it.
- **The host picks the sides** in the menu (White, Black or Random); the
  guest presses "Ready", the host "Start game", as in the other party
  games. "Rematch" swaps the sides; "Menu" goes back for both.
- **Reloading:** a guest who reloads gets the whole game and is back at
  once. The host keeps the game in the tab's `sessionStorage`, so a
  reload of the host's tab continues it too (the guest comes back on its
  own). If the guest leaves, the host sees "… left the game. Waiting for
  them to come back…" and the other player is marked "(away)".
- **Resign** for both sides and alone: the button must be clicked twice
  within three seconds ("Really resign?"). In a party the guest asks the
  host, who ends the game. After the game the same button shows the
  result again. There is no offer of a draw.
- **Alone against the computer:** White, Black or Random, easy, medium or
  hard, and "Undo" (it takes back the own move and the computer's answer).
- **The picture never holds the rules up.** In the ZIP the next move
  waited for the walking animation, which runs only while frames are
  drawn; a tab in the background would have stopped. Now the rules
  change at once, and `pieceView.js` shows the moves one after another;
  moves that piled up are set without walking. So no clock for hidden
  tabs (`ticker.js`) is needed: chess has no running time, and every
  message is handled when it arrives.
- **Smaller changes:** the camera stands further back on a narrow screen
  (a phone held upright), so the whole board fits; the side panel moves
  to the bottom there. With "reduce motion" the pieces do not bob or hop
  and the camera does not swing. A pawn reaching the last rank without a
  choice becomes a queen. The shadow type is `PCFShadowMap`.

**Why:** The same rules as for every other game: static folders, small
files, no CDN, one way to play together. The referee model of the other
party games means two screens cannot disagree about a move or the result;
for a turn-based game the guest needs no prediction beyond showing its own
move at once. The look of a world made of blocks is a common style; the
figures, the island and the code are the ZIP author's own, and the store
texts do not refer to any other game.

**Version 1.0.1:** After a checkmate by the computer the developer saw
only a blue screen in Brave (inside the launcher); the board was gone and
"View the board" showed nothing. Blue is the page background, so the
browser had dropped the 3D view (a "lost WebGL context"). It could not be
made to happen in Chrome here, but a measurement showed why the graphics
chip was under strain: the pieces needed more than 5500 draw calls per
frame (every face of every little box had a texture and draw call of its
own). Two changes:

- `pieces.js` copies all face textures of a kind of piece onto one sheet
  (a texture atlas, built once when the game loads) and joins the fixed
  boxes of each part of a figure (body, arm, leg ...) into one mesh. Moving
  parts stay separate. The pieces look the same (compared in close-ups);
  the board now needs about 620 draw calls and 73 textures instead of 665.
  Captured pieces beside the board no longer cast shadows.
- If the 3D view is lost anyway, three.js asks the browser to restore it
  and the game draws on. If it is not back after four seconds, a notice
  offers "Reload". A game alone is stored for that one reload and goes on
  where it was; the party host keeps its game anyway, and a guest rejoins.

## 52. Millpond: built from its plan, with these choices

**Decision:** Millpond (`games/millpond/`) is built step by step from
[MILLPOND.md](MILLPOND.md), laid out like Blockchess (decision 51). Where
the plan leaves something open, these defaults were chosen (the list grows
with every step):

- **Step 1 (rules, menu and connection):** the sides are called `'l'`
  (Ladybugs, they begin) and `'s'` (Snails) everywhere in the code and in
  the party messages. The 24 points are numbered 0 to 23: ring 0 is the
  outer square, ring 2 the inner one, and on every ring the points go
  clockwise from the top left corner (a drawing is at the top of
  `rules.js`). The Ladybugs sit at the near side (+z) of the board.
- A move travels as a short text: `p5` (place on point 5), `m5-6` (move or
  fly from 5 to 6), `x12` (remove the piece on 12). Removing is a move of
  its own right after the move that closed the mill; only then the turn
  passes. So a whole game is simply the list of these texts.
- How the rules count: "3 pieces left" for flying and "only 2 left" for
  losing count the pieces on the board plus those still in hand (so a side
  can also lose while placing). A side that cannot move loses only in the
  moving phase. The 50 moves without a mill count only moves (not
  removals) once all pieces are placed, both sides together. A position
  counts as the same when the pieces on the board, the pieces in hand and
  the side to move are the same; the start position counts once. Closing a
  mill while the opponent has no piece on the board removes nothing.
- The party connection (`net.js`) is copied from Blockchess with the room
  name `nss-millpond-<party code>`; the referee (`host.js`) and the guest's
  copy (`guest.js`) work exactly like there. The host keeps its game in
  `sessionStorage` (`millpond-host-<party code>`). three.js r187 with
  OrbitControls and PeerJS are the same files as in Blockchess
  (`vendor/`).
- The menu is a wooden sign with lily-green buttons and a soft round font;
  "How to play" is a fold-out list in the menu. Alone the default is
  Ladybugs and Medium.
- The camera cannot slide sideways (the board always stays in the middle)
  and has no flying keys, unlike Blockchess; it turns, zooms and swings to
  the own side with C.
- Until step 5 the computer plays a random allowed move at every strength,
  and the pieces are plain coloured discs until step 3.
- **Step 2 (the scene):** all sizes are in `world` and `koi` in
  `config.js`. The board's top is at height 0, the island's grass at
  -0.32 m, the pond's surface at -0.75 m; the island has a radius of
  7.5 m, the pond 24 m. Every placement (flowers, reeds, trees ...) comes
  from a fixed seed, so both players see the same pond.
- Things that come many times (reeds, flowers, mushrooms, stones, lily
  leaves, trees, hills, clouds) are one instanced mesh each: the whole
  scene needs about 180 draw calls per frame, far below the 620 of
  Blockchess after its fix (decision 51).
- The water is a fine grid whose corners rise and fall with three slow
  sine waves (weaker with "reduce motion"); the light spots are a painted
  texture that drifts over it. The koi are drawn after the water and let
  15 % of it through, so they look just under the surface but stay
  orange, white and red (drawn under the water they looked grey).
- The water mill stands on the shore towards +x and -z (angle -0.45), a
  house on a wooden platform with its wheel in front of it, facing the
  island, so the wheel is seen from its round side and not from its
  edge. A few low reed clumps stand off the island, the tall ones along
  the shore.
- The koi (7 fish) each swim towards a point a little further round the
  pond and then pick the next; soft pushes keep them 9.8 m from the middle
  (the island with its sand ends at 8.8 m), inside 21.8 m and 6 m away
  from the mill. A test script let 40 fish swim for ten minutes each: none
  came closer to the middle than 9.7 m or to the mill than 5.1 m, none got
  stuck, and they swam all the way round.
- The camera can zoom from 4 to 24 m and never looks from below 0.44 of a
  half turn, so it stays above the water and the hills always fill the
  edge of the picture. In a narrow window it stands further back (up to
  2.2 times).
- **Step 3 (figures and playing):** the figures are made in code
  (`pieces.js`): the fixed parts of a figure are joined into one shape with
  its colours on its corners. A ladybug is four parts (body with head and
  legs, two shell halves on a hinge behind the head, the wings), a snail
  one (foot, eyes on stalks, and a shell built as a tube that winds round
  in a spiral and gets thinner, with a dark band along it). The ladybug's
  dots are painted per corner, not per triangle, so they come out round.
- The pieces still to place stand in two rows on the grass next to the
  board: the Ladybugs on the near side (+z), the Snails on the far side;
  a placed piece hops from the end of its row onto its point. No flowers
  grow where the rows stand. The side panel shows the same as nine small
  stones per side (on the board, still to place, lost) and the numbers.
- Times (all under `anim` in `config.js`): placing 0.65 s; a step 0.3 s +
  0.3 s per metre, snails 1.4 times slower, ladybugs in three little hops;
  flying in a 1.6 m high arc; a closed mill glows 1.3 s, then the piece to
  remove is chosen; a removed ladybug flies away in 2.2 s, a removed snail
  slides in 2.6 s straight off the side of the board it stands on, over
  the grass and down the bank into the pond.
- A closed mill: the three pieces glow gold, a gold line grows along the
  mill, and the water mill's wheel turns six times faster and slows down
  again over 2.2 s. Two mills at once show two lines.
- Where the snail enters the water, two rings spread and a few drops jump
  up; the three nearest koi swim over to look (the spot is moved into the
  part of the pond the koi may use). With "reduce motion" there are no
  drops, no hopping and no bobbing of the chosen piece.
- The picture never holds the rules up: moves are queued, and when more
  than one is waiting (a tab in the background draws nothing), all but the
  last are set at once in the same frame. The board can be clicked only
  when nothing moves. If the picture ever shows something else than the
  rules while nothing moves, it is set anew from the rules.
