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
sky. All differences are in one table (`THEMES` in `scene.js`) and applied
by `setTheme()`; the rules differences are in `config.js` and `host.js`.

**Why:** The developers wanted a mode about precise guessing ("sniping")
instead of a shrinking arena, and accepted that it can take long. A
different look makes it obvious at a glance which mode is running.
