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
