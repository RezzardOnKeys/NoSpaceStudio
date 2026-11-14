# Contributing

Two of us work on this repository at the same time. These rules keep us from
stepping on each other's toes.

## Branch workflow

`main` should always build and run.

1. **Get the latest state** before you start: `git pull`
2. **Create a branch** for each piece of work: `git switch -c feat/friends-list`
3. **Commit small and often** on your branch.
4. **Push** and open a pull request on GitHub.
5. Wait for the CI checks (lint, typecheck, build) to turn green.
6. The other person takes a quick look, then **merge** into `main`.
7. Delete the branch afterwards.

Branch names: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`.

For tiny changes (a typo, a single doc line) committing straight to `main` is
fine, as long as you pulled first.

## Commit convention

We use [Conventional Commits](https://www.conventionalcommits.org), prefixed
with the version number from `PROTOKOLL.md`:

```
[v12] feat(store): add genre filter and live search
```

| Type       | Use it for                                              |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only                                      |
| `style`    | Formatting, no code change                              |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `chore`    | Tooling, dependencies, configuration                    |

The scope in brackets is the area you touched, e.g. `store`, `player`,
`friends`, `admin`, `ui`, `db`.

## The change log: PROTOKOLL.md

Every change gets an entry in [PROTOKOLL.md](PROTOKOLL.md) with a running
version number. Claude Code maintains this file automatically (see
[CLAUDE.md](CLAUDE.md)).

**If both of us added an entry at the same time**, git reports a conflict in
`PROTOKOLL.md` when merging. To solve it:

1. Open `PROTOKOLL.md` and find the markers `<<<<<<<`, `=======`, `>>>>>>>`.
2. **Keep both entries** and delete only the three marker lines.
3. Renumber so every version number exists once: the entry that was merged
   later gets the next higher number.
4. Put the newest entry on top, save, then `git add PROTOKOLL.md` and commit.

## Before you open a pull request

Run all checks locally:

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm run build
```

## Code conventions

- Everything the user sees is in **English**. So are code, comments and commit messages.
- TypeScript strict mode, **no `any`**.
- Small, reusable components. One component per file.
- Colours, radii and shadows come from the design tokens in
  `src/styles/index.css`. No hard-coded hex values in components.
- The product name comes from `src/config/brand.ts`. Never hard-code it.
- Every view that loads data needs a loading state (skeleton), an error state
  and an empty state.
- No dead files, no commented-out code.

## Secrets

Never commit keys or passwords. `.env` is ignored by git. The frontend may
only ever contain the public Supabase anon key, never the `service_role` key.
