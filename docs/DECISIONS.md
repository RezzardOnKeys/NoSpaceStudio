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
ourselves, entry by entry. Every page has an empty state for this. How to
add entries: decision 22.

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

## 16. Guests can browse and play

**Decision:** The store, game pages, news and the player work without an
account. Library, friends and profile redirect guests to the sign-in
page and bring them back afterwards.

**Why:** "No downloads" should also mean no hurdle before the first game.
Playtime only counts for signed-in players, which is the reason to sign up.
The rule lives in one place (`RequireAuth` in the router) and is easy to
change.

## 17. Usernames are stored in lower case and cannot be changed

**Decision:** The database only accepts `^[a-z0-9_]{3,20}$`. The sign-up form
lower-cases the input. Users may change their avatar and nothing else on
their profile; this is enforced with column-level privileges, not only RLS.

**Why:** Lower case makes names case-insensitive without an extension, and
profile links (`/u/name`) stay stable. Column privileges make it impossible
to write any other column, whatever a policy allows.

## 18. The profile is created by a database trigger

**Decision:** The sign-up form sends the username as user metadata. A trigger
on `auth.users` creates the profile row in the same transaction. If the name
is taken, the whole sign-up fails.

**Why:** There can never be an account without a profile or a profile without
a unique name, even if two people pick the same name at the same moment.

## 19. Database types are written by hand

**Decision:** `src/types/database.ts` mirrors the migrations by hand instead
of being generated with the Supabase CLI.

**Why:** Generating needs the CLI and a login, one more tool for a small
schema. The cost: the file must be updated together with every migration.

## 20. The app runs without Supabase values

**Decision:** If `.env` has no (or only the example) Supabase values, no
client is created. Everyone is a guest, the store and news still work, and
the account pages name the missing values and the setup guide.

**Why:** A fresh clone should start and explain itself instead of crashing
with a blank page.

## 21. Total playtime per game is a public counter

**Decision:** The table `game_stats` holds one running total per game.
Only `record_playtime()` adds to it; nobody can write it directly.

**Why:** "Most played" needs a number everyone may read, while the playtime
rows themselves are private. A counter avoids a public aggregate over private
data.

## 22. Games and news are files in the repository, there is no admin panel

**Decision:** A game is a folder `games/<slug>/` with a `game.json` (store
entry), an optional `description.md` and its images. A news post is a
Markdown file in `news/`. Vite collects them at build time
(`import.meta.glob`). The database has no games or news tables, no `is_admin`
flag and no image storage for games; it identifies a game by its slug. This
replaces the planned admin panel and the short-lived Supabase catalogue.

**Why:** A new game needs a push anyway (its folder). With the store entry
next to it, adding a game or a post is a single commit that can be reviewed,
reverted and written by Claude. It removes a whole phase of work (admin
forms, image upload, admin-only RLS). The price: every content change needs a
push, and the database cannot check that a slug belongs to a real game.

## 23. Drafts and future posts only show locally

**Decision:** A game with `"status": "draft"` and a news post dated in the
future are visible with `npm run dev`, but not in a production build.

**Why:** It gives us a preview without a separate preview system. Note that a
draft game's folder is still deployed and reachable by its direct URL, and
the text of hidden entries is part of the shipped bundle. Hidden is not secret.

## 24. A profile picture can be chosen only once

**Decision:** Users pick a profile picture once and cannot change or remove
it afterwards. The database enforces it: the file always has the path
`<user id>/avatar`, storage allows inserting it but not updating or deleting,
and `set_avatar()` only fills `profiles.avatar_url` while it is empty. The
column now holds the storage path, not a full URL.

**Why:** The developers want it that way. Enforcing it in the database (not
only by hiding the button) makes it hold against tricks. Storing only the
path means the column can never point to an image on another website.
Removing a picture is possible by hand in the Supabase dashboard
(docs/SUPABASE-SETUP.md).

**How:** The picture is cut to a square and shrunk to 512 × 512 pixels WebP
(JPEG where the browser cannot write WebP) on the device before the upload.
