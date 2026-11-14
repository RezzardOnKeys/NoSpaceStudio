<div align="center">

<img src="public/logo.svg" alt="NoSpaceStudio" width="320" />

### No downloads. No space needed.

A game launcher that lives entirely in your browser. Create an account, browse
the library and play instantly. Everything is free: no payments, no ads, no
in-app purchases.

[![CI](https://github.com/RezzardOnKeys/NoSpaceStudio/actions/workflows/ci.yml/badge.svg)](https://github.com/RezzardOnKeys/NoSpaceStudio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-7c5cff.svg)](LICENSE)

</div>

> **Status:** early prototype. The complete interface is built and starts with
> an empty catalogue; real accounts and a database are next.

<!-- TODO: replace with a real screenshot once the store page exists. -->
<p align="center"><em>Screenshot coming soon</em></p>

## Features

| Feature                                                    | Status           |
| ---------------------------------------------------------- | ---------------- |
| Design system (tokens, base components)                    | Done             |
| Store with search, genre and engine filters, sorting       | Done (mock data) |
| Game pages with gallery, patch notes and in-browser player | Done (mock data) |
| Library, friends, news and profile pages                   | Done (mock data) |
| Accounts with unique usernames                             | Planned          |
| Real playtime tracking                                     | Planned          |
| Admin panel for games and news                             | Planned          |
| Installable as a web app (PWA)                             | Planned          |

## Tech stack

| Area                    | Choice                                      |
| ----------------------- | ------------------------------------------- |
| Frontend                | Vite, React, TypeScript (strict)            |
| Styling                 | Tailwind CSS v4 with custom design tokens   |
| Routing                 | React Router                                |
| Data fetching           | TanStack Query                              |
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

This starts two servers:

- <http://localhost:5173> is the launcher
- <http://localhost:5174> serves the `games/` folder on its own origin

The component reference lives at <http://localhost:5173/dev/ui>.

### Scripts

| Command                | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Start launcher and games servers with hot reload |
| `npm run dev:web`      | Start only the launcher (port 5173)              |
| `npm run dev:games`    | Start only the games server (port 5174)          |
| `npm run build`        | Typecheck and build for production into `dist/`  |
| `npm run preview`      | Serve the production build locally               |
| `npm run lint`         | Check the code with ESLint                       |
| `npm run typecheck`    | Check types with TypeScript                      |
| `npm run format`       | Format all files with Prettier                   |
| `npm run format:check` | Verify formatting without changing files         |

## Project structure

```
.
├── .github/            CI workflow, pull request and issue templates
├── docs/               Decisions and guides
├── games/              Static games, served from a separate origin
│   └── _template/      Starting point for a new game
├── public/             Favicon, logo and other static files
├── supabase/           Database migrations and seed data (coming in phase 3)
└── src/
    ├── config/         brand.ts (name, slogan, logo, contact), env.ts
    ├── components/
    │   ├── brand/      Logo
    │   ├── layout/     App shell: sidebar, top bar, footer, mobile navigation
    │   └── ui/         Button, Input, Badge, Card, Modal, Toast, Skeleton, ...
    ├── features/       One folder per feature: games, player, library,
    │                   friends, news, profile, auth
    ├── hooks/          Shared React hooks
    ├── lib/            Helpers without UI (formatting, query client)
    ├── mocks/          Mock data and an in-memory stand-in for the backend
    ├── pages/          One file per route
    ├── routes/         Router definition and path constants
    ├── styles/         Design tokens and global CSS
    └── types/          Data shapes shared across the app
```

## How games are hosted

Games are plain static folders in `games/<slug>/` and are served from their
**own origin**, separate from the launcher. The launcher embeds them in a
sandboxed `<iframe>`. This way a game can never read a player's login session.
See [games/README.md](games/README.md) for the rules a game has to follow.

## Contributing

This is a two-person hobby project. See [CONTRIBUTING.md](CONTRIBUTING.md) for
the branch workflow and commit convention, and [PROTOKOLL.md](PROTOKOLL.md) for
the change log (in German).

## License

[MIT](LICENSE)
