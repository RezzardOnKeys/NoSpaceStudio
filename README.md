<div align="center">

<img src="public/logo.svg" alt="NoSpaceStudio" width="320" />

### No downloads. No space needed.

A game launcher that lives entirely in your browser. Create an account, browse
the library and play instantly. Everything is free: no payments, no ads, no
in-app purchases.

[![CI](https://github.com/RezzardOnKeys/NoSpaceStudio/actions/workflows/ci.yml/badge.svg)](https://github.com/RezzardOnKeys/NoSpaceStudio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-7c5cff.svg)](LICENSE)

</div>

> **Status:** early prototype. The project foundation is in place; the features
> below are being built phase by phase.

<!-- TODO: replace with a real screenshot once the store page exists. -->
<p align="center"><em>Screenshot coming soon</em></p>

## Features

| Feature                                     | Status  |
| ------------------------------------------- | ------- |
| Design system (tokens, base components)     | Done    |
| Store with search, genre and engine filters | Planned |
| Game pages and in-browser player            | Planned |
| Accounts with unique usernames              | Planned |
| Library and playtime tracking               | Planned |
| Friends and shared playtime                 | Planned |
| News feed and patch notes                   | Planned |
| Admin panel for games and news              | Planned |
| Installable as a web app (PWA)              | Planned |

## Tech stack

| Area                    | Choice                                      |
| ----------------------- | ------------------------------------------- |
| Frontend                | Vite, React, TypeScript (strict)            |
| Styling                 | Tailwind CSS v4 with custom design tokens   |
| Routing                 | React Router                                |
| Animation               | Motion (formerly Framer Motion)             |
| Icons                   | Lucide                                      |
| Backend, auth, database | Supabase (Postgres with Row Level Security) |
| Hosting                 | Cloudflare Pages                            |
| Code quality            | ESLint, Prettier, GitHub Actions            |

The reasoning behind these choices is recorded in [docs/DECISIONS.md](docs/DECISIONS.md).

## Getting started

You need [Node.js](https://nodejs.org) 22 or newer.

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run dev
```

Then open <http://localhost:5173>. The component reference lives at
<http://localhost:5173/dev/ui>.

### Scripts

| Command                | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Start the dev server with hot reload            |
| `npm run build`        | Typecheck and build for production into `dist/` |
| `npm run preview`      | Serve the production build locally              |
| `npm run lint`         | Check the code with ESLint                      |
| `npm run typecheck`    | Check types with TypeScript                     |
| `npm run format`       | Format all files with Prettier                  |
| `npm run format:check` | Verify formatting without changing files        |

## Project structure

```
.
├── .github/            CI workflow, pull request and issue templates
├── docs/               Decisions and guides
├── games/              Static games, served from a separate origin (coming in phase 2)
├── public/             Favicon, logo and other static files
├── supabase/           Database migrations and seed data (coming in phase 3)
└── src/
    ├── config/         brand.ts: name, slogan, logo, contact email
    ├── components/
    │   ├── brand/      Logo
    │   └── ui/         Button, Input, Badge, Card, Modal, Toast, Skeleton, ...
    ├── hooks/          Shared React hooks
    ├── lib/            Small helpers without UI
    ├── pages/          One file per route
    ├── routes/         Router definition and path constants
    └── styles/         Design tokens and global CSS
```

Feature code will live in `src/features/<feature>/` as the features arrive.

## How games are hosted

Games are plain static folders in `games/<slug>/` and are served from their
**own origin**, separate from the launcher. The launcher embeds them in a
sandboxed `<iframe>`. This way a game can never read a player's login session.

## Contributing

This is a two-person hobby project. See [CONTRIBUTING.md](CONTRIBUTING.md) for
the branch workflow and commit convention, and [PROTOKOLL.md](PROTOKOLL.md) for
the change log (in German).

## License

[MIT](LICENSE)
