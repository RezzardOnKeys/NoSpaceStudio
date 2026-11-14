-- =============================================================================
-- 0003: PLAYTIME
-- =============================================================================
--
-- WHAT THIS FILE DOES
--   It stores how long each user has played each game, and a public total
--   per game (for the "Most played" sorting in the store).
--
--   Two tables:
--     playtime    private: seconds per user and game
--     game_stats  public:  seconds per game, all players added up
--
-- HOW A GAME IS IDENTIFIED
--   Games are NOT stored in the database. The catalogue lives in the
--   repository (games/<slug>/game.json). So a game is identified here by its
--   slug, which is the folder name, e.g. 'star-dodger'.
--
-- HOW PLAYTIME GETS IN
--   The website cannot write these tables directly. While a game is open,
--   the player page calls the function record_playtime() about every 30
--   seconds ("heartbeat") and says how many seconds were played since the
--   last call. The function decides how many of them really count. That way
--   nobody can give themselves 1000 hours by sending a fake number.
--
-- The words RLS, policy, security definer etc. are explained at the top of
-- 0001_profiles.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Table: playtime per user and game (private)
-- -----------------------------------------------------------------------------

create table public.playtime (
  -- Whose playtime. Deleted together with the account.
  user_id uuid not null references public.profiles (id) on delete cascade,

  -- Which game: the folder name in games/. The check allows only lower-case
  -- letters, numbers and hyphens, the same rule as for folder names.
  game_slug text not null check (game_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- Total seconds played. Can never be negative.
  total_seconds integer not null default 0 check (total_seconds >= 0),

  -- When the user last played this game (used for "Continue playing").
  last_played_at timestamptz not null default now(),

  -- One row per user and game: the pair is the primary key.
  primary key (user_id, game_slug)
);

alter table public.playtime enable row level security;

-- READ: a user sees their own playtime, and the playtime of confirmed
-- friends. is_friend_of() comes from 0002_friendships.sql. Everyone else,
-- and all guests, see nothing.
create policy "Playtime is visible to the user and confirmed friends"
  on public.playtime for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_friend_of(user_id));

-- No direct writes from the website at all. Only record_playtime() below.
revoke insert, update, delete on table public.playtime from anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. Table: total playtime per game (public)
-- -----------------------------------------------------------------------------

-- Why a separate table? "Most played" needs one number per game that
-- everyone may read. The rows in "playtime" are private, so we keep a
-- running total here that reveals nothing about single users.
create table public.game_stats (
  game_slug text primary key check (game_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  total_seconds bigint not null default 0 check (total_seconds >= 0)
);

alter table public.game_stats enable row level security;

-- READ: everybody, also guests.
create policy "Game stats are readable by everyone"
  on public.game_stats for select
  to anon, authenticated
  using (true);

-- No direct writes. Only record_playtime() adds to the totals.
revoke insert, update, delete on table public.game_stats from anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. Function: the heartbeat
-- -----------------------------------------------------------------------------

-- Called by the player page with the game's slug and the seconds played
-- since the last call. Returns the user's new total for that game.
--
-- PROTECTION AGAINST CHEATING (two limits, the smaller one wins):
--   a) One call counts at most 60 seconds, whatever number is sent.
--   b) A call never counts more time than has really passed on the server's
--      clock since the previous call for this game, plus 5 seconds of
--      tolerance (browser timers are not exact).
--   So calling the function 100 times in one second gains almost nothing:
--   the first call counts, the others find that no time has passed.
--
-- What the database cannot check: whether the slug belongs to a real game,
-- because the catalogue lives in the repository. A cheater could collect
-- time for a made-up slug. It would never show up anywhere, since the
-- website only displays games that exist.
create function public.record_playtime(p_game_slug text, p_seconds integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_seconds_per_call constant integer := 60;
  tolerance_seconds constant integer := 5;
  me uuid := (select auth.uid());
  -- Limit a): squeeze the sent number into the range 0..60.
  -- coalesce() turns a missing number into 0.
  wanted integer := least(greatest(coalesce(p_seconds, 0), 0), max_seconds_per_call);
  previous public.playtime;   -- the user's existing row for this game, if any
  credited integer;           -- the seconds that really count for this call
  new_total integer;
begin
  -- Guests have no playtime.
  if me is null then
    raise exception 'not_signed_in';
  end if;
  if p_game_slug is null or p_game_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_game';
  end if;

  -- Look for the existing row. "for update" locks it until this function is
  -- done, so two heartbeats arriving at the same moment cannot both count
  -- the same time.
  select * into previous
  from public.playtime p
  where p.user_id = me and p.game_slug = p_game_slug
  for update;

  if found then
    -- Limit b): seconds that really passed since the last call, + tolerance.
    credited := least(
      wanted,
      greatest(0, floor(extract(epoch from now() - previous.last_played_at))::integer)
        + tolerance_seconds
    );
    update public.playtime p
    set total_seconds = p.total_seconds + credited, last_played_at = now()
    where p.user_id = me and p.game_slug = p_game_slug
    returning p.total_seconds into new_total;
  else
    -- First time this user plays this game: create the row.
    credited := wanted;
    insert into public.playtime (user_id, game_slug, total_seconds)
    values (me, p_game_slug, credited)
    -- Extremely rare: another call created the row a moment ago. Then just
    -- refresh the date instead of failing.
    on conflict (user_id, game_slug) do update
      set last_played_at = now()
    returning total_seconds into new_total;
  end if;

  -- Add the same seconds to the public total of the game. "on conflict"
  -- means: create the game's row if it is missing, otherwise add to it.
  if credited > 0 then
    insert into public.game_stats as s (game_slug, total_seconds)
    values (p_game_slug, credited)
    on conflict (game_slug) do update
      set total_seconds = s.total_seconds + credited;
  end if;

  return new_total;
end;
$$;

-- Guests may not call the heartbeat; signed-in users may.
revoke execute on function public.record_playtime(text, integer) from public, anon;
