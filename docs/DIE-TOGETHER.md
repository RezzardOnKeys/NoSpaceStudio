# Die Together – game plan

The complete plan for the third game, agreed with the developers on
2026-11-15. Build it exactly like this. Where this file leaves something
open, choose a sensible default, record it in `docs/DECISIONS.md` and tell
the developers in the hand-over. If a rule here turns out not to work, ask
before changing it.

Slug and folder: `games/die-together/`. Title in the store: **Die Together**.

**Status:** built (steps 1 to 5 done, still `"status": "draft"`). Choices
made while building it are recorded in decision 35 in
[DECISIONS.md](DECISIONS.md); sound is not built yet.

## The idea in one sentence

A first person shooter where every character is controlled by **two people
on two computers**: one has only the mouse (look, aim, shoot), the other
only the keyboard (walk, jump, reload). Characters fight each other in a
small arena whose walls close in. Talking to each other helps; not talking
is the funny chaos version.

## Players and teams

- A **character** (called "team" in the menu) always has exactly two
  players: one **Mouse** and one **Keyboard**.
- Every character fights every other character (free-for-all).
- Up to **4 characters = 8 players** (the party limit). With 4 people there
  are 2 characters, with 6 people 3, with 8 people 4.
- **Exactly 2 people:** they form one character and fight **one bot
  character**. With more than 2 people there are **no bots**.
- **Odd numbers cannot start.** The game only starts when every person in
  the party has a seat and every character that is used has both seats
  filled.
- **Started alone** (no party, or opened directly by its address): the game
  shows only a notice, there is no single player mode:
  "Die Together needs a party of 2, 4, 6 or 8 players. Start it from the
  launcher with your party."

## The menu (lobby inside the game)

- Shows up to 4 character cards in different colours (e.g. red, blue,
  yellow, green). Each card has two seats: **Mouse** and **Keyboard**,
  showing the name of the person sitting there.
- Everybody clicks a free seat; clicking another seat moves you there.
- The party members who are connected are listed; people still loading are
  shown as "joining…".
- Only the **host** has the **Start** button. It is enabled only when every
  connected party member has a seat, all expected party members (the
  `players` value from the launcher) are connected, and every used
  character has both seats. Otherwise the button explains what is missing,
  e.g. "Every team needs a mouse and a keyboard player" or "Waiting for
  balsak00…".
- **After every round everybody returns to this menu** and may pick a new
  team and role. Rounds are independent: no score is carried over.
- Short controls help on the menu screen: "Mouse: look, aim, shoot ·
  Keyboard: WASD walk, Space jump, R reload".

## Controls

| Role         | Input                         | Does                                             |
| ------------ | ----------------------------- | ------------------------------------------------ |
| **Mouse**    | Mouse movement (pointer lock) | Turns the character's view (left/right, up/down) |
|              | Left click                    | Shoots                                           |
| **Keyboard** | W A S D                       | Walks, relative to where the character looks     |
|              | Space                         | Jumps                                            |
|              | R                             | Reloads (never automatic)                        |

- The keyboard player's mouse is a normal mouse that does nothing in the
  game (no pointer lock for them). The mouse player's keyboard does nothing.
- Both players of a character see **the same first person view**: the eyes
  of their character. When the mouse player turns around, "forward" for the
  keyboard player turns too. This chaos is the point of the game; do not
  add helpers for the keyboard player.
- The mouse player has to click into the game once to lock the pointer;
  show "Click to aim" while it is not locked. The keyboard player has to
  click into the game once so it gets the key presses; show "Click to take
  the keyboard" while the game has no focus. (The game runs in an iframe of
  the launcher; it only gets keys after a click.)

## The weapon ("Pistol")

- A normal pistol. **No real brand name and no exact copy of a real model**
  (the developers asked for a Glock; it is called just "Pistol").
- **5 shots** per magazine, **unlimited magazines**.
- **1 second** between two shots.
- **Reload takes 2 seconds**, only when the keyboard player presses R. No
  automatic reload. R with a full magazine does nothing. No shooting while
  reloading.
- Empty magazine: clicking only makes a "click" sound and shows nothing.
- Hit detection: an instant ray from the centre of the view (hitscan),
  unlimited range, blocked by walls and obstacles. No spread, no recoil.
- Visible shot: a short muzzle flash and a thin tracer line, so everybody
  sees where shots come from.

## Lives

- Every character has **5 lives**. **One hit = one life.**
- A character with 0 lives is out for this round: it bursts into confetti
  in its colour, and its two players watch the rest of the round (camera of
  any character still alive, or a view from above).
- No respawn within a round.

## Screen (HUD), seen by both players of a character

- **Bottom left:** own lives as 5 small hearts.
- **Bottom right:** ammunition, e.g. 5 small bullets, the used ones greyed.
- **Over every opponent:** their remaining lives as small hearts floating
  above the head, visible through walls only when the opponent itself is
  visible.
- **Crosshair** in the middle. **Only for the mouse player:** a ring around
  the crosshair that fills up while the keyboard player reloads. (The
  keyboard player gets no extra hint.)
- A small label "You are: Mouse" or "You are: Keyboard" in a corner, in the
  team colour.

## The map

- A **small square arena**, roughly 30 × 30 units, with a flat floor.
- **Obstacles everywhere**, so it is never just an open field: crates
  (some high enough to jump on), short wall pieces, pillars, a ramp up to a
  low platform. Cover in every part of the arena.
- **The walls close in:** for the first **20 seconds** nothing happens.
  Then the four outer walls slowly move inwards, until after about **90
  seconds** only a small square in the middle is left (about 6 × 6 units),
  and they stop there. Touching the moving wall **pushes the character
  inwards and costs no life**. Obstacles that the wall reaches sink into
  the floor.
- Characters start in the corners, as far apart as possible.

## A round

1. Host presses Start. Everybody sees a countdown "3, 2, 1, Go!" in the
   arena; nobody can move or shoot during it.
2. The fight: walls start closing after 20 seconds.
3. The last character standing wins. If the last characters lose their
   last lives at the same moment, it is a draw.
4. A winner screen for about 4 seconds: "Red team wins!" with both names
   of the winning team.
5. Back to the menu.

If a player of a character leaves during a round (tab closed), that
character is out. If the host leaves, the game ends for everybody (the
launcher already stops the party game in that case) and the others see
"The host left the game."

## The bot (only when exactly 2 people play)

- One bot character with the same rules: 5 lives, 1 second between shots,
  5 shots per magazine, 2 seconds reload.
- Simple behaviour: walks between cover points, turns towards the players'
  character when it can see it, waits a short random reaction time before
  shooting, misses sometimes, reloads when empty, moves away from the
  closing walls.
- It should be beatable for a coordinated pair, but not trivially.

## Look and sound

- Comic style like Blind Drop: toon shading, thick outlines, bright team
  colours, a cheerful sky. Characters are round, cute figures with big
  eyes in their team colour, holding the pistol.
- **No blood.** A hit shows comic stars or a small flash, the hit character
  blinks. Being out: confetti burst.
- Short sound effects made in the browser (Web Audio, no files needed):
  shot, empty "click", reload, hit, confetti pop. Respect the system's
  reduced motion setting for screen shake.
- All texts in the game are English.

## How it connects (for the developer building it)

- Same model as Blind Drop (decision 32): the **party host's browser is the
  referee**. It runs the rules (movement, collisions, hits, lives, walls,
  bot) and sends the state to everybody about 20 times per second.
- Keyboard players send their pressed keys; mouse players send their view
  direction and their shots. The host combines both inputs of a character.
- The mouse player turns the view **locally at once** (it must feel
  instant) and sends the direction to the host; the keyboard player sees
  the view through the host's state, smoothed. Positions of all characters
  are smoothed between state messages.
- A shot is checked by the host against its own state, using the direction
  the mouse player sent with the shot.
- Copy the connection code from `games/blind-drop/net.js` (host opens a
  room from the party code, guests retry, ping every 2 seconds). It must
  handle up to 7 guests.
- Players are a list everywhere; teams are a list of up to 4 entries with
  a mouse seat and a keyboard seat each.

## Files

Like Blind Drop, without a build step:

```
games/die-together/
  index.html     menu, HUD and notices
  config.js      all numbers and colours (lives, cooldowns, speeds, map size, wall timing)
  host.js        the referee: rules, bot, walls
  scene.js       three.js: arena, characters, effects
  net.js         connection (from blind-drop)
  game.js        client: input by role, camera, HUD, menu
  game.json      store entry
  description.md
  cover.svg, banner.svg
  vendor/        three.js and PeerJS with their license files (copy from blind-drop)
```

## Launcher changes this game needs

The launcher must learn that a game can need **at least 2 players** and an
**even number** of players.

- `game.json` gets two new optional fields:
  - `"minPlayers"` (default 1)
  - `"evenPlayers"` (default false): the party size must be even
- For Die Together: `"minPlayers": 2, "maxPlayers": 8, "evenPlayers": true`.
- Read them in `src/features/games/api.ts` (with a clear error if
  `minPlayers` is bigger than `maxPlayers`), add them to `Game` in
  `src/types/models.ts`, document them in `docs/ADDING-A-GAME.md` and
  `docs/PARTY-GAMES.md`.
- **Store card** (`GameCard.tsx`): the player badge shows `2–8` instead of
  `1–8` (it uses `minPlayers`).
- **Game page, "Players" fact** (`GamePage.tsx`): e.g. "2–8, even number,
  party only".
- **Game page play button** (`GamePlayActions.tsx`, see decision 34). New
  rules for a game with `minPlayers > 1` or `evenPlayers`:

| Situation                              | Button            | Hint below                                           |
| -------------------------------------- | ----------------- | ---------------------------------------------------- |
| Not in a party (or alone in the party) | grey              | "Needs a party of 2, 4, 6 or 8 players."             |
| Member (not host)                      | grey              | "Only the party host can start games." (as today)    |
| Host, party smaller than `minPlayers`  | grey              | "Needs at least 2 players. Your party has 1."        |
| Host, odd party size and `evenPlayers` | grey              | "Needs an even number of players. Your party has 3." |
| Host, party bigger than `maxPlayers`   | grey              | "Up to 8 players. Your party has 9." (as today)      |
| Host, everything fits                  | "Play with party" | –                                                    |

The list "2, 4, 6 or 8" is built from `minPlayers`, `maxPlayers` and
`evenPlayers`, not typed in. All other games must behave exactly as
before.

## Order of work

1. Launcher support (`minPlayers`, `evenPlayers`, store card, game page);
   lint, typecheck, build; hand-over.
2. The game: menu and connection first (seats, start rules, notice when
   started alone), tested with several browser tabs.
3. Arena, movement by role, shooting, lives, HUD, walls, round flow.
4. Bot, comic effects, sounds, store entry (`game.json` with
   `"status": "draft"` until the developers have tested it with real
   accounts), cover, banner, description, patch note in `news/`.
5. Documentation: `docs/ROADMAP.md` (status), `docs/DECISIONS.md` (new
   decision for the game), `games/README.md` (table), `docs/PARTY-GAMES.md`
   (third example).

## How to test without accounts

Claude cannot sign in. Open the game directly on the games server with the
party values in the address, one tab per person, e.g. 4 tabs:

```
http://localhost:5174/die-together/#party=ABCDEF0123456789ABCDEF0123456789&role=host&name=anna&players=4
http://localhost:5174/die-together/#party=ABCDEF0123456789ABCDEF0123456789&role=guest&name=ben&players=4
...
```

Load the host tab first, and reload a tab after changing only the part
after `#` (the browser does not reload by itself then). The real party
flow through the launcher is tested by the developers with their accounts.
