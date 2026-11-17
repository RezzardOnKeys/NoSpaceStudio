# Teleport Snipe – game plan

The complete plan for the sixth game, agreed with the developers on
2026-11-17. Build it exactly like this. Where this file leaves something
open, choose a sensible default, record it in `docs/DECISIONS.md` and tell
the developers in the hand-over. If a rule here turns out not to work, ask
before changing it.

Slug and folder: `games/teleport-snipe/`. Title in the store:
**Teleport Snipe**.

**Status:** in progress. Steps 1 and 2 are done (version 0.2.0, draft);
next is step 3. Choices made while building: decision 50.

## The idea in one sentence

A one-on-one sniper duel in a Japanese temple garden: every shot that does
not hit the opponent teleports the shooter to a completely random spot on
the map – maybe behind the opponent, maybe right in front of their scope.

The feeling we want: **fast, sharp and nervous**. Sniping must feel
snappy and satisfying (instant hit, quick zoom, clear feedback), and every
miss is a gamble that makes both players shout. It is our own game: name,
map, characters and code are original, and no texts refer to other games.

## What makes the feeling (read this first)

The developers love how sniping feels in fast browser arena shooters.
Build that feeling with **our own code and our own numbers**; do not look
for, copy or imitate another game's code, assets or look. What matters:

- **Hitscan:** the shot hits at the same moment the button is pressed.
  No bullet flight, no bullet drop.
- **Quick zoom:** right mouse button zooms in within about **0.12 s**, out
  even faster. While zoomed, mouse speed is scaled with the zoom so that
  aiming feels the same at every zoom level.
- **Fast, light movement:** quick to start and stop, strong control in
  the air, jumps that land fast (high gravity), a slide that keeps speed.
- **Clear feedback:** a hit marker on every hit, the opponent drops at
  once, a bright tracer line for every shot (from the gun to where it hit,
  fading over about 0.4 s), a small recoil kick of the view.
- **Every number lives in `config.js`**, so the developers can tune the
  feeling after playing. Claude cannot test the mouse inside the game
  (pointer lock), so the feeling is tuned by the developers.

Starting values (all in `config.js`, tune later):

| What                         | Value                                                                |
| ---------------------------- | -------------------------------------------------------------------- |
| Run speed                    | 7.5 m/s                                                              |
| Speed while zoomed           | 55 % of run speed                                                    |
| Jump                         | up to about 1.3 m high, gravity about 24 m/s²                        |
| Slide (crouch while running) | starts at 11 m/s, slows down to walking within 0.8 s; once every 1 s |
| Crouch                       | slower (3 m/s), lower body                                           |
| Field of view                | 80° normal, 22° zoomed                                               |
| Zoom in / out                | 0.12 s / 0.08 s                                                      |
| Reload after a shot          | **exactly 1 s** (fixed rule, not a tuning value)                     |
| Spread without zoom          | random within about 7° (very inaccurate)                             |
| Spread zoomed                | none                                                                 |

## Players

- **Party:** exactly **2 players**, one against one. `"maxPlayers": 2` in
  `game.json`. The launcher needs no changes.
- **Alone** (started without a party): **against 1 bot**, with the same
  rules. Both modes are in version 1.0.
- `"status": "published"` once version 1.0 is finished and tested
  (the developers want it in the launcher right away); while building it
  stays `"draft"`.

## The rules

- Each player has **one shot**. After every shot they **reload for
  exactly 1 second**, then they have one shot again.
- **Every hit kills**, wherever it hits (head, body, legs). The round is
  over at once.
- **Shooting without zoom is allowed but very inaccurate** (spread above).
- **Every shot that does not hit the opponent teleports the shooter to a
  completely random spot on the map.** It does not matter where the shot
  went (wall, ground, sky). The spot can be anywhere a player can stand:
  in the open middle, on the pagoda balcony, behind the opponent, right in
  the opponent's line of fire. **No protection** after landing.
  - The only rules for the spot: the player must fit there (never inside
    a wall, tree, lantern or roof, never in the pond) and never inside or
    touching the other player (at least 1.5 m away).
  - After the teleport the player keeps looking in the same direction as
    before.
- **A flash shows both places:** where the player was and where they
  landed, a short bright column of light (about 3 m high, so it is seen
  above low cover) that fades in and out softly over about 0.6 s, in the
  player's colour, with a few cherry petals whirling. Visible to both
  players, but not through walls.
- **First to 3 won rounds wins the match.**
- **No time limit** for a round.
- Falling off the map is not possible (a temple wall goes all around).

## A round

1. Both players start at **two fixed start points** on opposite sides of
   the map (they swap sides every round).
2. Countdown **3 s**: players can look around and zoom, not move or shoot.
3. Play until one player is hit.
4. The hit: **1.5 s slow motion** (the game runs at a quarter of its speed,
   the tracer line stays), then a short card: "Round 2 – You win the
   round" with the score (e.g. **2 : 1**).
5. After 2.5 s the next round starts. After the match: a result card
   ("You win!" / "You lose") and, for the host or when alone, "Again".

## The map: the temple garden

About **50 x 50 m**, a walled Japanese temple garden in soft afternoon
light. **Medium overview:** an open, dangerous middle, enough cover
around it, no maze.

- **Middle:** a raked gravel garden with a few large rocks (low cover
  only). Crossing it is risky.
- **Around it:** stone lanterns, cherry trees (with slowly falling
  petals), bamboo groves, low stone walls, a wooden tea house, a red
  wooden bridge over a small koi pond (the pond itself cannot be stood
  in; the bridge can), a torii gate.
- **Raised spots (2–3):** the balcony of a **three-storey pagoda** (reached
  by stairs), the **veranda of the tea house**, a small **hill with a bell
  frame**. Good overview, but easy to see there.
- **Around everything:** a temple wall with a tiled roof (too high to jump
  on).
- Paths and stairs let players reach every raised spot on foot too.
- Build the map as data (`map.js`: boxes, stairs, start points, the list of
  places where a player can stand) and its look separately (`mapView.js`).

**Where a teleport can land:** prepare a list of standing spots when the
map is built: a grid of about 0.75 m on every walkable surface (ground,
bridge, stairs, balconies, veranda, hill), keeping only spots where the
player's body fits. A teleport picks one of these at random (equal chance
for each), skipping spots closer than 1.5 m to the other player.

## Controls

- **W A S D** move, **mouse** look (pointer lock, click the game to catch
  the mouse).
- **Hold the right mouse button** to zoom, **left click** to shoot.
- **Space** jump.
- **Shift** or **C** crouch; while running it starts a slide.
- **Mouse speed slider** in the menu, like in Die Together, Inkwars and
  Dust Dash (0.3× to 3×, remembered in the browser).
- Without a mouse: arrow keys turn the view (like the other games), **E**
  shoots, **Q** zooms. Not meant to be competitive, just possible.

## Screen (HUD)

- A small dot as the crosshair without zoom; zoomed: a round scope view
  with a black edge and thin cross lines.
- A ring around the crosshair that fills during the 1 s reload.
- Hit marker (a short white cross) on a hit.
- Score at the top: own colour and name left, the opponent right, e.g.
  **1 : 2**, and "First to 3".
- Short texts in the middle: countdown, "Teleported!", the round card.
- Respect the system's reduced motion setting (no screen shake, softer
  flashes, no slow motion zoom effects).

## The bot (alone only)

- Plays by the same rules: same speed, one shot, 1 s reload, random
  teleport on a miss.
- Moves between cover spots, looks towards where the player could be,
  and shoots when it sees the player. It needs a **reaction time** (about
  0.45 s after first seeing the player) and makes **aiming errors**
  (larger when the player moves or is far away), so it can miss and
  teleport too.
- Its numbers are under `bot` in `config.js`, so the developers can make it
  weaker or stronger.
- It has no knowledge the player does not have (it does not see through
  walls), but it does see the teleport flashes like a player.

## Look

- Clean, colourful low-poly 3D with soft shading: white and grey stone,
  red and dark wood, pink cherry blossom, green bamboo, light gravel.
  Sharp and readable so that players can be spotted at a distance; keep
  it fast (aim for smooth frames on a MacBook Air in Safari and Chrome).
- Players: a simple, friendly figure in a long coat in the player's colour
  with a sniper rifle. A player is clearly visible against the background
  (colour and a thin outline).
- Each player picks one of **six colours** in the menu; a colour the other
  player has taken is greyed out.
- No blood: a hit player falls over and vanishes in a puff of petals.
- **No sound at all** in version 1.0 (agreed with the developers). Do not
  build any audio code now.
- The menu and the result have their own look that fits the garden (for
  example a wooden plaque or a paper scroll), like Dust Dash has its
  parcel tag. All texts in the game are English.

## How it connects (for the developer building it)

- **The party host's browser is the referee** (`host.js`): who is where,
  shots, hits, teleports, rounds, the bot. It sends the state to the guest
  about 30 times per second. The list of all party messages goes at the
  top of `host.js`.
- **The guest moves itself at once** with the same movement rules and is
  corrected softly; looking around and zooming are local and instant.
- **Hits with lag compensation:** a shot is sent with the shooter's
  position, view direction and time. The host keeps a short history of
  where each player was (about the last 0.5 s) and checks the guest's shot
  against where the host player was on the guest's screen. The host's
  answer decides hit or miss.
- **Teleports without waiting:** host and guest share a seed per match;
  the teleport spot of a player's n-th shot comes from that seed, the
  player and n. So the shooter can teleport at once on their own screen,
  and the host lands them on the same spot. If the host says the shot was
  a hit, the round ends anyway.
- The party connection follows `docs/PARTY-GAMES.md` (PeerJS, the room
  from the party code, the guest retries, a ping every 2 seconds, a
  hidden host tab keeps running on a clock). The gameplay code is written
  new for this game. The proven connection and timing helpers of the
  other games (`net.js`, `ticker.js`) may be reused, and three.js and
  PeerJS are copied into `vendor/` with their license files (decision 27).
- A guest who reloads during a match rejoins and gets the current score
  and positions.

## Files

Plain JavaScript without a build step, one small file per job (like
the other 3D games, decision 38); the list goes at the top of `game.js`:

```
games/teleport-snipe/
  index.html     menu, HUD, round card, result
  config.js      every number (movement, zoom, spread, reload, flash, bot)
  map.js         the garden as numbers (boxes, stairs, start points, standing spots)
  sim.js         the rules: movement, slide, shots, hits, teleports, rounds
  random.js      the seeded random numbers (teleport spots)
  host.js        the referee; list of all party messages at its top
  guest.js       the guest's copy of a match, own movement ahead
  wire.js        packing for the network
  net.js         party connection, ticker.js clock for hidden tabs
  bot.js         the bot
  scene.js       three.js setup, mapView.js the garden, playerView.js the players,
                 viewModel.js the own rifle, effects.js tracers, flashes, petals
  controls.js    keyboard, mouse, mouse speed slider
  lobby.js       the menu, hud.js the display during a match and the result
  game.js        one player's screen, ties everything together
  game.json      store entry ("maxPlayers": 2)
  description.md
  cover.svg, banner.svg
  vendor/        three.js and PeerJS with their license files
```

## Order of work

1. Folder, `game.json` (`"status": "draft"`), menu with colours and the
   mouse speed slider, party connection; the game starts alone and with
   two tabs.
2. The temple garden (data and look), first person movement with
   collisions, jumping, crouching, sliding, stairs.
3. The rifle: zoom, hitscan shots, spread without zoom, 1 s reload,
   tracers, hit marker; target dummies to test aiming.
4. Teleports: standing spots, random choice from the seed, the two
   flashes; rounds, slow motion, round card, first to 3, result.
5. Party: host as referee, guest moving ahead, shots with lag
   compensation, teleports without waiting, reload during a match.
6. The bot.
7. Polish: petals, light, cover, banner, description, patch note in
   `news/` (`game_update`, version 1.0.0), then `"status": "published"`.
8. Documentation: `docs/ROADMAP.md` (status), `docs/DECISIONS.md` (a new
   decision with every choice made while building), `games/README.md`
   (table), `docs/PARTY-GAMES.md` (another example), this file's status
   line.

After each step: hand-over as in `CLAUDE.md` (the developers commit in
between), and test in the browser alone and with two tabs.

## How to test without accounts

Claude cannot sign in. Open the game directly on the games server with the
party values in the address, one tab per person:

```
http://localhost:5174/teleport-snipe/#party=ABCDEF0123456789ABCDEF0123456789&role=host&name=anna
http://localhost:5174/teleport-snipe/#party=ABCDEF0123456789ABCDEF0123456789&role=guest&name=ben
```

Alone against the bot: `http://localhost:5174/teleport-snipe/`.

Load the host tab first, and reload a tab after changing only the part
after `#`. The Browser pane must be visible, and only one tab is shown at
a time, so the hidden host tab runs on the clock in `ticker.js`. Claude
cannot catch the mouse (pointer lock): test aiming and shots with test
scripts (for example by setting the view direction in code) and leave the
real feeling to the developers. Stop every test server at the end
(ports 5173, 5174 and 4173).
