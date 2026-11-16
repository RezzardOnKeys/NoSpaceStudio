# Dust Dash – game plan

The complete plan for the fifth game, agreed with the developers on
2026-11-16. Build it exactly like this. Where this file leaves something
open, choose a sensible default, record it in `docs/DECISIONS.md` and tell
the developers in the hand-over. If a rule here turns out not to work, ask
before changing it.

Slug and folder: `games/dust-dash/`. Title in the store: **Dust Dash**.

**Status:** planned, not built yet.

## The idea in one sentence

Two players race through a cosy old wooden hall in first person and vacuum
up dust, dirt and sawdust; whoever has sucked up the most after four
minutes wins, and whoever reaches the random delivery crate first gets a
surprise power-up for ten seconds.

The feeling we want: calm, warm and **satisfying** (dirt flying into the
nozzle and popping away, clean wood appearing underneath), with a
friendly race on top. It is our own game: name, hall, characters and code
are original, and no texts refer to other games.

## Players

- **Party:** exactly **2 players**, every player for themselves.
  `"maxPlayers": 2` in `game.json`, like Inkwars. The launcher needs no
  changes.
- **Alone** (started without a party): against **1 bot**.
- More players and more bots may come later; write player lists and the
  bot so that this stays possible (players are a list everywhere, the
  limit is one number in `config.js`), but build and test only 1 vs 1.
- Players **cannot disturb** each other: no pushing, no blocking, no
  stealing points. The only contest is the dirt itself: what one player
  has sucked up, the other cannot get any more. Characters do not collide
  with each other (they walk through each other), so nobody can block a
  doorway.

## The menu (lobby inside the game)

Like Inkwars (`games/inkwars/lobby.js`):

- Each player picks one of eight colours (the colour of their vacuum and
  character). A colour the other player has taken is greyed out; the host
  goes first if both want the same one.
- Party: the guest presses **"Ready"**, the host presses **"Start match"**
  when the guest is ready. Alone: one **"Start"** button (against the bot).
- The controls are shown under the buttons.
- After a match only the host can go back to the menu (rematch), like
  Inkwars.

## Controls

- **W A S D** walk, **mouse** look (pointer lock, click the game to catch
  the mouse), **hold the left mouse button** to vacuum.
- Without a mouse: **arrow keys** turn the view, **E** vacuums (like
  Inkwars).
- No jumping.
- **Vacuuming slows you down:** walking speed is about **5 m/s while
  vacuuming** and about **7 m/s while not vacuuming**. So players must
  decide: run to the delivery quickly, or take the dirt on the way and
  maybe miss it. Both numbers go into `config.js`.

## The dirt and the points

- The whole floor of the hall is covered with small pieces of dirt, laid
  out in natural looking patches (thicker in corners, along walls and
  under workbenches, thinner in the open):
  - **dust bunnies** (soft grey fluff),
  - **dirt crumbs** (small brown bits),
  - **sawdust and wood shavings** (light, curly, golden), mostly around
    the workbenches.
- **Every piece is worth 1 point.** The points are the only score. There
  is no bag to empty: players can vacuum all the time.
- The layout is made from a **seed** (a random number the host picks at the
  start), so both browsers build exactly the same pieces with the same
  numbers (ids). Plan for several thousand pieces; draw them with
  `THREE.InstancedMesh` so that many pieces stay fast. Tune the amount so
  that two good players do not clean the whole hall in four minutes.
- **Vacuuming:** while the button is held, pieces inside the nozzle's area
  in front of the player (a short, wide zone on the floor, about 1.6 m
  ahead and 1.2 m wide) are sucked in: they lift off, fly in a short
  curve into the nozzle (about 0.2 s, quicker the closer they are) and
  disappear with a tiny pop (a quick shrink). The counter goes up.
- **Clean wood shows:** under the dirt the floor has a dusty grey film
  (a texture mask, like the colour mask in Inkwars). Wherever a nozzle has
  passed, the film disappears and the warm wooden floor shines through.
  This is only for looks and does not count; it may differ a little
  between the two screens.
- Only the host decides who got which piece (see "How it connects").

## Deliveries and power-ups

- **Top left** a timer counts down: `Delivery in 0:24`.
- About every **35 seconds** (first one after about 25 seconds, numbers
  in `config.js`) a **cardboard box** drops into the hall: a hatch in the
  roof opens, a beam of light shows the spot, the box falls and bounces a
  little.
- The spot is random but **fair**: a free spot on the floor (not inside an
  obstacle) that is roughly the same walking distance from both players.
- While a box is waiting, **both players see a small delivery icon** at
  its place, **also through walls and shelves**, with the distance in
  metres. If the box is behind the player or outside the view, the icon
  sits at the edge of the screen and points the way.
- **Whoever touches the box first opens it** and gets one **random
  power-up for exactly 10 seconds**. A big word shows what it is (e.g.
  "Turbo shoes!"); the other player sees "Ben got Turbo shoes". Then the
  timer starts again.
- Power-ups are **not stacked**: a player has at most one at a time. If
  they open a new box while one is active, the new one replaces the old
  one and runs for the full 10 seconds.
- The four power-ups:
  - **Wide nozzle:** the vacuum area is about twice as wide.
  - **Turbo shoes:** walk clearly faster (vacuuming and not vacuuming).
  - **Strong suction:** pieces are pulled in from much further away
    (longer and a little wider area).
  - **Golden nozzle:** every piece counts double.
- The HUD shows the active power-up with its icon and a bar that runs
  down over the 10 seconds; the nozzle in first person changes look
  (wider, glowing, golden).

## Screen (HUD)

- Top left: delivery timer (or "Delivery waiting!" while a box lies in
  the hall).
- Top middle: the round clock (4:00 counting down) and both scores side by
  side in the players' colours, own score first.
- Bottom right: the own vacuum in first person (nozzle and a bit of the
  hose), moving a little while walking and shaking softly while
  vacuuming.
- The active power-up with its 10-second bar.
- Small crosshair dot in the middle.
- Countdown 3-2-1 before the start, "GO!".

## The hall

- One hall for the first version, about 40 × 26 m, made of simple boxes
  (like `games/inkwars/arena.js`), laid out by hand, **fair for both
  start points** (point mirrored like Inkwars, or the same on both sides).
- Wooden floor and walls, big windows with warm sunlight falling in as
  visible beams, dust floating in the light.
- Obstacles to walk around (no jumping): shelves with boxes, workbenches
  with tools and wood shavings, stacks of crates, barrels, a few posts
  holding the roof. They create corners and lanes, so route choice
  matters.
- The two players start on opposite sides.

## A round

1. Countdown 3 s (players can look around, not move).
2. **4 minutes** of vacuuming and deliveries.
3. When the time is up, everything stops. The result card shows both
   scores counting up and "You win!", "You lose" or "Draw". **No view of
   the hall from above** and no map of who cleaned where (that would be
   too much like Inkwars).
4. Host: "Again" brings both back to the menu.

## The bot (alone only)

- Walks to places with a lot of dirt (it knows a coarse grid of how much
  dirt is left where), vacuums on the way and around there, and walks
  around obstacles (path finding like `games/inkwars/nav.js`).
- When a box drops, it goes for it if it is not clearly further away than
  the player; it stops vacuuming to run faster when the box is far.
- It plays fair: same speeds, same nozzle, same rules, no knowledge the
  player does not have. Its numbers (reaction time, how much it prefers
  boxes) are in `config.js` (`bot…`), so the developers can make it weaker
  or stronger.

## Look

- Comic style like Blind Drop (`games/blind-drop/look.js`): toon shading
  with a few hard steps and thick outlines, but **warm and cosy**: honey
  and brown wood tones, soft orange sunlight, gentle shadows.
- The opponent is a round, cute character with big eyes in their colour,
  wearing a vacuum on their back with a hose and nozzle in front.
- No violence of any kind.
- **No sound at all** in the first version, like the other games. Sounds
  come later, for all games together. Do not build an audio file or any
  sound code now.
- Respect the system's reduced motion setting for shaking.
- All texts in the game are English.

## How it connects (for the developer building it)

Use what Inkwars already does well (decisions 39 and 40):

- **The party host's browser is the referee** (`host.js`): rules, dirt,
  points, deliveries, power-ups, the bot. It sends the state to the guest
  about 30 times per second.
- **The guest moves its own character itself at once** with the same
  movement rules and sends its keys step by step; the host plays them back
  one per step and the guest is corrected softly (copy the model of
  `games/inkwars/feed.js`, `guest.js` and `wire.js`). Looking around is
  local and instant.
- **Dirt:** both browsers build the same pieces from the seed. The host
  decides who got which piece and sends a list of the pieces removed since
  the last message (ids, packed small, e.g. as steps from one id to the
  next) plus the scores. On the guest, pieces in front of its own nozzle
  fly into the nozzle at once (for the feeling); the score always comes
  from the host. A guest who joins late or reloads gets the full list of
  removed pieces once (like `exportState` in Inkwars).
- **Boxes:** the host decides where a box drops and who touched it first;
  the guest sees the box and the icon from the host's state.
- Copy the connection code from `games/inkwars/net.js` (PeerJS, host opens
  a room from the party code, guest retries, ping every 2 seconds) and the
  clock for a hidden host tab (`ticker.js`).
- The list of all party messages goes at the top of `host.js`.

## Files

Like Inkwars and Blind Drop, plain JavaScript without a build step, one
small file per job (decision 38); the list goes at the top of `game.js`:

```
games/dust-dash/
  index.html     menu, HUD, result card
  config.js      every number (speeds, nozzle sizes, timings, power-ups, dirt amount, bot)
  hall.js        the hall as numbers (boxes, start points, collision)
  dirt.js        the pieces of dirt from a seed, which are left, the grid for the bot
  sim.js         the rules: movement, vacuuming, boxes, power-ups
  host.js        the referee; list of all party messages at its top
  feed.js        the guest's keys on the host (from inkwars)
  guest.js       the guest's copy of a match, own movement ahead
  wire.js        packing for the network
  net.js         party connection (from inkwars), ticker.js clock for hidden tabs
  bot.js         the bot (with nav.js for paths)
  scene.js       three.js setup, look.js comic style, hallView.js the hall,
                 dirtView.js the dirt and the dust film, playerView.js the other
                 player, viewModel.js the own vacuum, effects.js boxes and sparkles
  marker.js      the delivery icon (also through walls, at the screen edge)
  controls.js    keyboard and mouse
  lobby.js       the menu, hud.js the display during a match and the result
  game.js        one player's screen, ties everything together
  game.json      store entry ("status": "draft", "maxPlayers": 2)
  description.md
  cover.svg, banner.svg
  vendor/        three.js and PeerJS with their license files (copy from inkwars)
```

## Order of work

1. Folder, `game.json` (draft), menu and party connection copied from
   Inkwars, the game starts alone and with two tabs.
2. The hall in comic look, first person movement with collisions, mouse
   look, the faster walking without vacuuming.
3. Dirt from a seed, vacuuming with flying pieces, the dust film, points,
   HUD, round flow (countdown, 4 minutes, result, rematch).
4. Deliveries: timer, falling box, fair spot, icon through walls,
   power-ups with their 10 seconds.
5. Party: host as referee, guest moving ahead (feed), dirt removal and
   boxes over the network, reload during a match.
6. The bot.
7. Polish: sunbeams and floating dust, nozzle looks for the
   power-ups, cover, banner, description, patch note in `news/`.
8. Documentation: `docs/ROADMAP.md` (status), `docs/DECISIONS.md` (new
   decision for the game with every choice made while building it),
   `games/README.md` (table), `docs/PARTY-GAMES.md` (fifth example), this
   file's status line.

After each step: hand-over as in `CLAUDE.md` (the developers commit in
between), and test in the browser alone against the bot and with two tabs.

## How to test without accounts

Claude cannot sign in. Open the game directly on the games server with the
party values in the address, one tab per person:

```
http://localhost:5174/dust-dash/#party=ABCDEF0123456789ABCDEF0123456789&role=host&name=anna
http://localhost:5174/dust-dash/#party=ABCDEF0123456789ABCDEF0123456789&role=guest&name=ben
```

Alone against the bot: `http://localhost:5174/dust-dash/`.

Load the host tab first, and reload a tab after changing only the part
after `#` (the browser does not reload by itself then). The real party
flow through the launcher is tested by the developers with their accounts.

Two things learned while testing Inkwars in the Claude desktop app: the
Browser pane must be visible (otherwise frames stop), and only one tab is
shown at a time, so the hidden host tab runs on the clock in `ticker.js`.
If `npm run dev` says port 5174 is in use, a test server from Claude may
still be running: stop it before handing over.
