# Decisions

Short records of decisions that are not obvious from the code. Newest at the
bottom. Add an entry whenever we deviate from the original plan or choose
between real alternatives.

## 1. The launcher lives in the repo root

**Decision:** The Vite app sits in the repository root instead of `apps/web/`.

**Why:** We have one app and one folder of static games. A monorepo layout
would add workspace tooling without any benefit. Cloudflare Pages can still
build two projects from this repo: the launcher (build output `dist/`) and
the games (folder `games/`, no build step).

## 2. Tailwind CSS v4 with CSS-first tokens

**Decision:** All design tokens are defined in `src/styles/index.css` inside
`@theme`. Tailwind's default colour palette is reset.

**Why:** Tokens are plain CSS variables, usable in utilities and in custom CSS
alike. Resetting the palette makes it impossible to accidentally use a colour
that is not part of the design.

## 3. Accent colour: electric violet

**Decision:** `#7c5cff` as the single accent hue, with `#6d4aff` as the solid
button fill and `#a594ff` for accent-coloured text on dark surfaces.

**Why:** It stands apart from the white of the Epic launcher and the blue of
Steam. The darker fill is needed because white text on `#7c5cff` narrowly
misses the WCAG AA contrast ratio of 4.5:1; on `#6d4aff` it passes.

## 4. Inter, self-hosted

**Decision:** The Inter variable font is bundled via `@fontsource-variable/inter`.

**Why:** No request to Google Fonts means one less third party to cover in the
privacy policy, and the font also works offline.

## 5. `motion` instead of `framer-motion`

**Decision:** We install the `motion` package and import from `motion/react`.

**Why:** Framer Motion was renamed to Motion. It is the same library by the
same authors; `motion` is the package that receives updates.

## 6. Native `<dialog>` for modals

**Decision:** `Modal` wraps the browser's `<dialog>` element.

**Why:** Focus trapping, Escape to close and an inert background come built
in, are accessible by default and need no extra dependency.

## 7. Brand name injected into index.html at build time

**Decision:** `index.html` contains `%BRAND_NAME%` style placeholders that a
small Vite plugin fills from `src/config/brand.ts`.

**Why:** The name must be changeable in one place. Without this, the page
title and meta description would be a second place to edit.

## 8. MIT license

**Decision:** The repository is public under the MIT license.

**Why:** It is the simplest permissive license. Note that it currently covers
everything in the repo, including the games in `games/`. If a game should not
be freely reusable, give its folder its own license file.

## 9. No `eslint-plugin-jsx-a11y` for now

**Decision:** The accessibility lint plugin is not installed.

**Why:** At setup time it did not yet support ESLint 10. Accessibility rules
are enforced by convention (see CLAUDE.md) until it does.

## 10. TanStack Query as the data layer

**Decision:** All data access goes through TanStack Query hooks in
`features/<feature>/queries.ts`.

**Why:** It gives every view loading, error and cached states without
hand-written plumbing. It also lets the interface be built against mock
functions first: moving to Supabase only replaces the query functions.

## 11. The catalogue starts empty

**Decision:** There are no demo games, demo news, demo playtime or demo
players. `games/`
only contains `_template/`, the starting point for a new game. This replaces
the earlier approach of eight mock entries with generated artwork.

**Why:** The platform should show only what we really publish, so we fill it
ourselves, entry by entry. Every page has an empty state for this. Until the
database and the admin panel exist, entries can be added by hand in
`src/mocks/games.ts` and `src/mocks/news.ts`.

## 12. (withdrawn)

Mock entries pointing to the template no longer exist; see decision 11.

## 13. iframe sandbox for games

**Decision:** Games are embedded with
`sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-orientation-lock"`
and `allow="fullscreen; gamepad; autoplay"`.

**Why:** `allow-same-origin` is needed so a game can use its own storage (save
games, Unity's asset cache). This is safe only because games are served from
a different origin than the launcher, so "same origin" never includes the
login session. Popups, top-level navigation, forms and downloads stay blocked.

## 14. Store filters live in the URL

**Decision:** Search text, genres, engine and sorting are query parameters
(`/?q=drift&genre=Arcade&sort=az`).

**Why:** A filtered view can be shared and survives going to a game and back.
The search field in the top bar writes the same parameter, so it works from
every page.

## 15. Tab bar instead of sidebar on small screens

**Decision:** Below the `lg` breakpoint the sidebar is replaced by a bottom
tab bar.

**Why:** A fixed sidebar takes too much width on phones and tablets, and a
bottom bar is within thumb reach.
