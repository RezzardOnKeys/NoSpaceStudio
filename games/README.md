# Games

Every game is a static folder: `games/<slug>/` with an `index.html` as its
entry point. No build step. Whatever is in the folder gets served as is.

The folder also holds the game's store entry: `game.json` (title, genres,
status, ...), an optional `description.md` and the images. The launcher reads
these files when it is built. Step by step:
[docs/ADDING-A-GAME.md](../docs/ADDING-A-GAME.md) (in German).

| Folder | What it is |
| --- | --- |
| `_template/` | Starting point for a new game. Copy it and rename the copy |
| `wpm-trainer/` | 99-Finger WPM Trainer (typing race, 2 players through a party only, PeerJS in `vendor/`) |
| `blind-drop/` | Blind Drop (3D bomb duel, modes Classic and Snipe, 2 players or practice against a bot; three.js and PeerJS in `vendor/`) |
| `die-together/` | Die Together (3D shooter, two players steer one character; 2, 4, 6 or 8 players from a party, with 2 against a bot; three.js and PeerJS in `vendor/`) |
| `dust-dash/` | Dust Dash (cosy vacuum race in a wooden hall with deliveries and power-ups; 1 vs 1 from a party or alone against a bot; three.js and PeerJS in `vendor/`) |
| `inkwars/` | Inkwars (3D water fight: paint the arena, dive into your own colour; 1 vs 1 from a party or alone against bots; three.js and PeerJS in `vendor/`) |
| `blockchess/` | Blockchess (3D chess on a floating block island with hand-made pieces; 1 vs 1 from a party or alone against the computer; three.js, chess.js and PeerJS in `vendor/`) |
| `teleport-snipe/` | Teleport Snipe (one-shot sniper duel in a temple garden, every miss teleports you; 1 vs 1 from a party or alone against a bot; three.js and PeerJS in `vendor/`) |

## Rules for a game

- **Use relative paths** (`game.js`, not `/game.js`). The game lives in a
  subfolder, so absolute paths break.
- **Fill the window and do not scroll.** The launcher shows the game in an
  iframe that fills the player and can go fullscreen.
- **Do not rely on the launcher.** Games run on a separate origin and cannot
  see the login session. That is on purpose.
- Saving progress in `localStorage` works, but wrap it in `try/catch`.

## Running locally

`npm run dev` in the repo root starts two servers: the launcher on
<http://localhost:5173> and this folder on <http://localhost:5174>. Open
<http://localhost:5174/_template/> to see the template, or
`http://localhost:5174/<your-game>/` to test a game on its own.
