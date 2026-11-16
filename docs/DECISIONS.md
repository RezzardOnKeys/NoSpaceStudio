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
