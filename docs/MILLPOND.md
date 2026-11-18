# Millpond – game plan

The plan for the eighth game, agreed with the developers on 2026-11-18.
Build it exactly like this. Where this file leaves something open, choose
a sensible default, record it in `docs/DECISIONS.md` (decision 52) and
tell the developers in the hand-over. If a rule here turns out not to
work, ask before changing it.

Slug and folder: `games/millpond/`. Title in the store: **Millpond**.

**Status:** published as version 1.0.0 on 2026-11-18. Steps 1 to 6 are
done; step 7, the documentation, is next.

## The idea in one sentence

The old board game Nine Men's Morris (German "Mühle") on a cosy little
island in a mill pond: ladybugs against snails on a wooden board, koi
swimming around the island, a water mill turning its wheel, and a camera
you can turn around the whole scene like in Blockchess.

The feeling we want: **cosy, calm and warm**, a game you play with a cup
of tea. It is our own game: name, figures, look and code are original.
Nine Men's Morris itself is a traditional game that belongs to nobody;
use only its rules, never the name or look of a commercial edition, and
never the German name "Mühle" in the game (the game is called Millpond,
the rules are explained in our own words).

## Players

- **Party:** exactly **2 players**, one against one. `"maxPlayers": 2` in
  `game.json`. The launcher needs no changes.
- **Alone** (started without a party): **against the computer**, easy,
  medium or hard, with "Undo" (takes back the own move and the computer's
  answer), as in Blockchess.
- `"status": "draft"` while building; `"published"` once version 1.0.0 is
  finished and tested (the developers want it in the launcher then).

## The two sides

- **Ladybugs** (red shells with black dots) and **Snails** (honey-coloured
  shells, a curl on top). Both are friendly, round low-poly figures, easy
  to tell apart from every camera angle, also on a small screen.
- The **Ladybugs always begin** (like White in chess).
- In a party the **host picks the sides** in the menu (Ladybugs, Snails or
  Random); the guest presses "Ready", the host "Start game", as in the
  other party games. "Rematch" swaps the sides. Alone, the player picks
  the side and the strength.

## The rules (Nine Men's Morris)

Explain them in the game in our own short words ("How to play" in the
menu).

- The board has 24 points: three squares inside each other, joined in
  the middle of each side.
- Each player has **9 pieces**.
- **Placing:** the players take turns putting one piece on a free point
  until all 18 pieces are placed.
- **Moving:** then the players take turns moving one own piece along a
  line to a neighbouring free point.
- **Flying:** a player with only **3 pieces** left may move a piece to any
  free point.
- **Mill:** three own pieces in a row on one line. Whoever closes a mill
  (by placing or moving) removes one piece of the opponent. Pieces in a
  mill are protected, unless all of the opponent's pieces are in mills.
  Closing two mills at once removes only one piece.
- **Win:** the opponent has only 2 pieces left, or cannot move any piece
  in the moving phase.
- **Draw:** the same position (same pieces, same player to move) comes up
  for the third time, or 50 moves in a row (both players together) without
  a mill in the moving phase.
- **Resign** for both sides: the button must be clicked twice within three
  seconds ("Really resign?"), as in Blockchess. No offer of a draw.
- No time limit.

## The scene: the mill pond

Built from simple, soft low-poly shapes in warm afternoon light (like the
other 3D games, own code).

- **The island:** a small round island of grass with a few flowers and
  mushrooms. In its middle a **wooden board** with the three squares, its
  24 points as little round wooden pegs or carved hollows.
- **The pond** all around: calm water with soft waves and light spots,
  water lilies with a few pink flowers, reeds and stones at the edge.
- **Koi** swim in the pond: about 6 to 8 orange, white and red-and-white
  fish swimming slowly in curves, never through the island.
- **A water mill** at the edge of the pond: a little wooden house with a
  wheel that turns slowly in the water.
- Further out: soft hills, a few trees and a sky with light clouds, so the
  camera never sees an empty edge.
- **Camera:** like Blockchess: drag with the mouse to turn around the
  island, the mouse wheel zooms, the camera never goes below the water or
  too far away; **C** turns to the own side of the board. On a phone the
  camera stands further back so the whole board fits. Touch: drag to
  turn, tap to choose.

## The extras

- **Possible moves are shown:** clicking an own piece shows small dots on
  the points it may go to (like Blockchess), and while placing all free
  points glow softly.
- **A mill is a little event:** the three pieces light up, a glowing line
  runs along the mill, and the water mill's wheel turns quickly for a
  moment. Then the player picks the piece to remove; removable pieces are
  marked.
- **Removed pieces leave in character:** a ladybug opens its wings and
  flies away; a snail slides off the board into the pond with a small
  splash, and the koi swim over to look.
- **Click the water:** a ripple spreads and the nearest koi swim towards
  it (just for fun, also while waiting for the other player).
- **Day and dusk:** **N** switches between afternoon and dusk: the light
  turns warm and low, little stone lanterns on the island glow and
  fireflies float over the reeds.
- **Who is to move** and the phase are always shown ("Place a piece – 6
  left", "Move a piece", "Remove a snail!"), with the remaining pieces of
  both sides as small rows of figures next to the board.
- Respect the system's reduced motion setting: no swinging camera, calmer
  water, figures without hopping.
- **No sound** in version 1.0, like the other games.

## Screen

- The menu and the result have their own look that fits the pond, for
  example a wooden sign or a big water lily leaf. All texts in English.
- During a game: whose turn it is, the phase, the pieces still to place
  and the pieces lost for each side, the names of both players, "Resign",
  alone also "Undo".
- After the game: "You win!", "You lose" or "Draw" with the reason (for
  example "The snails have only 2 pieces left"), "Rematch" (host or alone)
  and "Menu".

## The computer (alone only)

- Plays the same rules. A search over the next moves (minimax with
  alpha-beta), with a simple score: pieces, open mills, pieces that can
  still move, mills that are about to close.
- **Easy** looks only one move ahead and sometimes picks a weaker move;
  **medium** a few moves; **hard** deeper. It runs in a **web worker**
  (like Blockchess) so the picture never freezes; it waits at least half
  a second before it moves, so it feels like an opponent.
- Its numbers (depths, thinking time) are under `ai` in `config.js`.

## How it connects (for the developer building it)

- It is a **turn-based game like Blockchess**, so do it the same way
  (decision 51): the host's browser holds the one true game (`host.js`,
  with the list of all party messages at its top). The guest checks its
  own move with the same rules, shows it at once and sends it with its
  move number; the host plays it only if it is that side's turn, the
  number fits and the move is legal, and confirms it. Otherwise, or if the
  guest missed a message, the guest gets the whole game again (the list
  of moves) and starts over from it.
- A move in the game's data is one of: place at a point, move from a point
  to a point, remove at a point. The whole game is the list of moves, so it
  can be sent, stored and replayed.
- The rules never wait for an animation (decision 51): the picture shows
  the moves one after another and sets piled-up moves without animation.
- A guest who reloads gets the whole game at once; the host keeps the game
  in the tab's `sessionStorage`, so a reload of the host continues it too.
- The party connection follows `docs/PARTY-GAMES.md` (PeerJS, the room
  from the party code, the guest retries, a ping every 2 seconds). The
  connection code, the camera and the menu flow of Blockchess may be taken
  over and adapted; the rules, the scene, the figures and the computer are
  written new for this game. three.js (r187, with OrbitControls) and
  PeerJS are copied into `vendor/` with their licence files (decision 27).

## Files

Plain JavaScript without a build step, one small file per job (decision
38); the list goes at the top of `game.js`:

```
games/millpond/
  index.html     menu, the display during a game, result
  config.js      every number (camera, animation times, computer, colours)
  rules.js       the rules: board, phases, mills, removing, flying, results, draws
  host.js        the referee; list of all party messages at its top
  guest.js       the guest's copy of a game
  ai.js          the computer; aiWorker.js runs it in a web worker
  net.js         party connection
  scene.js       three.js setup, light, day and dusk
  world.js       the island, the board, the pond, the water mill, the landscape
  koi.js         the swimming fish and the ripples
  pieces.js      the ladybug and snail figures; pieceView.js places, moves,
                 removes and animates them
  board.js       the points of the board, marks, what is under the mouse
  camera.js      turning and zooming the camera
  menu.js        the menu, hud.js the display during a game and the result
  game.js        one player's screen, ties everything together
  game.json      store entry ("maxPlayers": 2)
  description.md
  cover.svg, banner.svg
  vendor/        three.js (with OrbitControls) and PeerJS with their licence files
```

## Order of work

1. Folder, `game.json` (`"status": "draft"`, version 0.1.0), `rules.js`
   with all rules and a test script (placing, moving, flying, mills,
   protected pieces, removing, win, both draws, replaying a list of
   moves), the menu with the choice of side and strength, party
   connection; the game starts alone and with two tabs (a simple board is
   enough for now).
2. The scene: island, wooden board, pond with water lilies and reeds,
   koi, water mill, landscape, light; the camera.
3. The figures and playing with the mouse: placing, moving, flying,
   possible moves, mills with their light, removing (ladybug flies away,
   snail slides into the pond); the display during a game; the result.
   Alone against a player who makes random moves is enough for testing.
4. Party: host as referee, guest copy, rematch, resign, reload of guest
   and host.
5. The computer (easy, medium, hard) in a web worker, "Undo".
6. Polish: clicking the water, day and dusk with lanterns and fireflies,
   reduced motion, phone layout, cover, banner, description, patch note in
   `news/` (`game_update`, version 1.0.0), then `"status": "published"`.
7. Documentation: `docs/ROADMAP.md` (status), `docs/DECISIONS.md` (decision
   52 with every choice made while building), `games/README.md` (table),
   `docs/PARTY-GAMES.md` (only if something new is learned), `README.md`
   (list of games), this file's status line.

After each step: hand-over as in `CLAUDE.md` (the developers commit in
between), and test in the browser alone and with two tabs.

## How to test without accounts

Claude cannot sign in. Open the game directly on the games server with the
party values in the address, one tab per person:

```
http://localhost:5174/millpond/#party=ABCDEF0123456789ABCDEF0123456789&role=host&name=anna
http://localhost:5174/millpond/#party=ABCDEF0123456789ABCDEF0123456789&role=guest&name=ben
```

Alone against the computer: `http://localhost:5174/millpond/`.

Load the host tab first, and reload a tab after changing only the part
after `#`. In Claude's browser pane, tabs in the background often draw no
frames, and a background tab may even report itself as visible; a test
clock in a worker, set only in the test tab, helps (see the hand-overs of
Teleport Snipe). Test the rules with test scripts (whole games, all
endings). Stop every test server at the end (ports 5173, 5174 and 4173).
