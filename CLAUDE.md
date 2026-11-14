# CLAUDE.md

Project rules for every Claude Code session in this repository. Two developers
work here in parallel, each with their own sessions. Follow these rules exactly.

## Project

NoSpaceStudio is a browser game platform (like a game launcher, but as a
website). Slogan: "No downloads. No space needed." Everything is free: no
payments, no ads, no in-app purchases.

- **Talk to the developers in German.** They are hobby developers: explain
  manual steps (Supabase, Cloudflare, env variables) step by step and
  beginner-friendly.
- **UI text, code, comments and commit messages are English only.**
- Desktop first (MacBooks, Safari + Chrome), responsive down to phones.
- **The plan lives in `docs/ROADMAP.md`:** target features, data model, the
  phases and their status. Read it before starting a phase, work phase by
  phase, and update its status table when a phase is done.

## Git rules (strict)

The folder is a clone of the shared GitHub repository. Work directly in the
repo root, on the branch the session started on.

**NEVER run** any command that changes git state or the remote:
`git commit`, `git push`, `git pull`, `git merge`, `git rebase`, `git reset`,
`git checkout`, `git switch`, `git branch` (create/delete), `git tag`,
`git stash`, `git init`, `git clone`, `git remote` (modify), and anything similar.
Do not suggest force pushes, branch deletions or history rewrites unless asked.

**Allowed (read-only):** `git status`, `git diff`, `git log`, `git remote -v`,
`git branch --show-current`, `git config user.name`.

The developers commit and push themselves. Never delete or blindly overwrite
existing files; extend them.

### Hand-over after each phase or larger task

1. Short summary of what was built or changed
2. List of new and changed files
3. A ready-to-copy commit message in Conventional Commits format, starting
   with the protocol version, e.g. `[v12] feat(library): add genre filter and search`
4. Instructions for testing the result locally

## PROTOKOLL.md (automatic, after EVERY result)

Maintain `PROTOKOLL.md` in the repo root automatically, without being
reminded, after **every** prompt that changes code or files. Pure questions
without changes get no entry.

- Entries are written in German, newest on top, with a running version number.
- Before assigning a number, read the highest existing number and add one.
- Read the author name with `git config user.name`.
- Format:

  ```markdown
  ## Version 12 – 2026-11-20 – Branch: main – von: <git user.name>

  **Prompt (Kurzfassung):** Genre-Filter und Suche in der Library einbauen
  **Änderungen:**

  - Genre-Filter (Mehrfachauswahl) im Store hinzugefügt
  - Live-Suche nach Titel
    **Geänderte Dateien:** src/features/store/Filters.tsx, src/features/store/useGameSearch.ts
    **Commit-Message:** `[v12] feat(store): add genre filter and live search`
    **GitHub-Commit:** _ausstehend_
  ```

- **Fill in commits:** at the start of every new prompt, run
  `git log --oneline -n 30`. For entries still marked `_ausstehend_` whose
  `[vX]` now appears in a commit message, replace `_ausstehend_` with the short
  hash and a link `https://github.com/RezzardOnKeys/NoSpaceStudio/commit/<hash>`.
  Versions that were never committed stay `_ausstehend_`.
- If parallel work causes a merge conflict in `PROTOKOLL.md`, explain how to
  resolve it: keep both entries, renumber (see CONTRIBUTING.md).

## Secrets

Never write keys or passwords into committed files. `.env` is git-ignored.
The frontend may only use the public Supabase anon key, never `service_role`.

## Tech stack

Vite, React 19, TypeScript (strict), Tailwind CSS v4, React Router, TanStack
Query, Motion (`motion/react`, use sparingly), Lucide icons, react-markdown,
Supabase (auth with email + password, Postgres with RLS, storage for images
only), Cloudflare Pages. Deviations and their reasons are recorded in
`docs/DECISIONS.md`; add new decisions there.

## Commands

- `npm run dev` – launcher on http://localhost:5173 and the games server on
  http://localhost:5174 (`dev:web` / `dev:games` start one of them)
- `npm run lint`, `npm run typecheck`, `npm run build` – must all pass before
  handing over
- `npm run format` – Prettier

If `npm install` fails with `EACCES` inside `~/.npm`, the local npm cache has
files owned by root. Do not work around it silently; tell the developer to run
`sudo chown -R $(id -u):$(id -g) ~/.npm` once.

## Architecture

- The launcher (this Vite app) lives in the repo root and deploys as one
  Cloudflare Pages project.
- Games are static folders in `games/<slug>/` (entry `index.html`) and deploy
  as a **second** Pages project on a separate origin. The launcher embeds them
  in a sandboxed `<iframe>`. The base URL comes from `VITE_GAMES_BASE_URL`.
  Reason: a game must never be able to read the user's login session.
- Supabase Storage is for avatars only. They are resized in the browser
  (`lib/image.ts`) and can be set only once per user (decision 24). Game images live in the game's folder.
- **Games and news are files, not database rows** (decision 22). A game's
  store entry is `games/<slug>/game.json` (+ optional `description.md`, cover,
  banner, screenshots in the same folder); a news post is `news/<name>.md`
  with a header block. There is no admin panel and no admin role. To add
  content follow `docs/ADDING-A-GAME.md`; the file formats are defined in
  `features/games/api.ts` and `features/news/api.ts`.
- Supabase holds accounts, playtime, friendships and avatars only. Games are
  referenced by their slug.
- SQL changes go into numbered files in `supabase/migrations/`, with comments
  that explain every part in simple English (the developers read them to
  learn). RLS on every table. Never edit a migration that may already have
  been run in Supabase; add a new numbered file instead.

## Folder structure

```
src/
  config/         brand.ts (single source for name, slogan, logo, contact), env.ts
  components/ui/  base components (Button, Input, Badge, Card, Modal, Toast, Skeleton,
                  EmptyState, ErrorState, Avatar, Chip, Select, Markdown, Lightbox, ...)
  components/layout/  AppShell, Sidebar, TopBar, Footer, MobileNav
  components/brand/   Logo
  features/<feature>/  feature code: games, player, library, friends, news, profile, auth
                       (queries.ts holds the data hooks, api.ts loads the data)
  hooks/          shared hooks
  lib/            helpers without UI (format.ts, query-client.ts, query-keys.ts,
                  supabase.ts, content.ts for reading content files)
  pages/          one file per route
  routes/         router and path constants (paths.ts)
  styles/         index.css with all design tokens
  types/          models.ts: app-level data shapes; database.ts: database rows
                  (hand-written, keep in sync with supabase/migrations/)
games/            static games (plain HTML/JS, not linted); each folder's game.json
                  is the store entry and IS read by the launcher build
news/             news posts as Markdown files
supabase/         migrations
docs/             ROADMAP.md (plan and status), DECISIONS.md, guides
```

## Data flow

Components never fetch data themselves. They call a hook from
`features/<feature>/queries.ts` (TanStack Query). The hooks call async functions
from `features/<feature>/api.ts` (Supabase rows or content files from the
repository, mapped to the camelCase shapes in `types/models.ts` there).
Components and types do not know where the data comes from. Query keys come
from `lib/query-keys.ts`. Hooks that need an account are disabled for guests
(`enabled: userId !== null`).

Auth: `useAuth()` (`features/auth/auth-context.ts`) gives the raw sign-in
state, `useCurrentUser()` the profile (`null` for guests). Routes are guarded
in `routes/router.tsx` with `RequireAuth` and `GuestOnly`.
Get the client with `getSupabase()` from `lib/supabase.ts`; it throws a
helpful error while `.env` is not filled in.

## Code conventions

- No `any`. Prefer `interface` for object shapes, inline `type` imports.
- Import from `@/…` (alias for `src/`).
- One component per file, named exports, small and reusable.
- Use the design tokens (`bg-surface`, `text-fg-muted`, `bg-accent-strong`, …).
  Tailwind's default colour palette is disabled on purpose. No hex values in
  components.
- Never hard-code the product name; use `brand` from `@/config/brand`.
- Never hand-type route URLs; use `paths` from `@/routes/paths`.
- Filters that should survive navigation live in the URL (see `useStoreFilters`).
- Buttons that are links: `<Link className={buttonStyles({ … })}>`.
- Every data view has loading (Skeleton), error (with a hint how to fix it)
  and empty states (EmptyState, ErrorState). Feedback via `useToast()`.
- Accessibility: visible focus, labels on all inputs, `aria-label` on icon
  buttons (use `IconButton`), respect `prefers-reduced-motion`.
- No dead files, no commented-out code.
