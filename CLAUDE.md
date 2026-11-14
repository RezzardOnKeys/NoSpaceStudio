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
- Supabase Storage is for images only (covers, banners, screenshots, avatars).
  Compress and resize images in the browser before upload.
- SQL changes go into numbered files in `supabase/migrations/`. RLS on every
  table. `is_admin` is set manually in the Supabase dashboard and must never
  be writable by users.

## Folder structure

```
src/
  config/         brand.ts (single source for name, slogan, logo, contact), env.ts
  components/ui/  base components (Button, Input, Badge, Card, Modal, Toast, Skeleton,
                  EmptyState, ErrorState, Avatar, Chip, Select, Markdown, Lightbox, ...)
  components/layout/  AppShell, Sidebar, TopBar, Footer, MobileNav
  components/brand/   Logo
  features/<feature>/  feature code: games, player, library, friends, news, profile, auth
                       (each has a queries.ts with its data hooks)
  hooks/          shared hooks
  lib/            helpers without UI (format.ts, query-client.ts, query-keys.ts)
  mocks/          mock data + api.ts, an in-memory stand-in for the backend
  pages/          one file per route
  routes/         router and path constants (paths.ts)
  styles/         index.css with all design tokens
  types/          models.ts: app-level data shapes
games/            static games (plain HTML/JS, not linted, not part of the build)
supabase/         migrations and seed.sql
docs/             DECISIONS.md and guides
```

## Data flow

Components never fetch data themselves. They call a hook from
`features/<feature>/queries.ts` (TanStack Query). The hooks call async functions
that currently live in `src/mocks/api.ts`. When a feature moves to Supabase,
only the query function changes; components and types stay as they are. Query
keys come from `lib/query-keys.ts`.

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
