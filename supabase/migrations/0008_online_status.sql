-- =============================================================================
-- 0008: ONLINE STATUS ("online", "playing ...", "last seen ...")
-- =============================================================================
--
-- WHAT THIS FILE DOES
--   It lets friends see each other's status:
--     Online                      the launcher is open
--     Playing <game>              the player is in a game
--     Offline · last seen ...     neither, with the time of the last visit
--
-- HOW IT WORKS
--   While the launcher is open, it calls report_status() every 30 seconds
--   (and right away when a game starts or ends). That saves "now" and the
--   game being played in the table user_status. Someone counts as online
--   while their last report is less than 75 seconds old. Closing the tab
--   simply stops the reports, so after at most 75 seconds they are offline.
--
--   The comparison with "now" happens in the database (friend_statuses), so
--   a wrong clock on someone's computer cannot make a friend look offline.
--
-- PRIVACY
--   Only confirmed friends can see a status (is_friend_of from
--   0002_friendships.sql). There is deliberately no way to appear offline:
--   the developers decided that everybody's status is visible to their
--   friends.
--
-- The words RLS, policy, security definer etc. are explained at the top of
-- 0001_profiles.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. The table
-- -----------------------------------------------------------------------------

create table public.user_status (
  -- One row per user, deleted together with the account.
  user_id uuid primary key references public.profiles (id) on delete cascade,

  -- The game the user is playing (folder name in games/), or empty.
  game_slug text check (game_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- When the launcher last reported in. Used for "online" and "last seen".
  last_seen_at timestamptz not null default now()
);

alter table public.user_status enable row level security;

-- READ: your own row and your friends' rows. Nobody else.
create policy "Users and their friends see the status"
  on public.user_status for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_friend_of(user_id));

-- No direct writes. Only report_status() below.
revoke insert, update, delete on table public.user_status from anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. Function: "I am here" (called by the launcher)
-- -----------------------------------------------------------------------------

-- p_game_slug is the game that is open right now, or null in the launcher.
create function public.report_status(p_game_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;
  if p_game_slug is not null and p_game_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_game';
  end if;

  -- Create the row on the first report, update it on every later one.
  insert into public.user_status (user_id, game_slug, last_seen_at)
  values (me, p_game_slug, now())
  on conflict (user_id) do update
    set game_slug = excluded.game_slug, last_seen_at = excluded.last_seen_at;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. Function: the status of all my friends
-- -----------------------------------------------------------------------------

-- Returns one row per friend who has ever opened the launcher. is_online is
-- true while the last report is less than 75 seconds old (30 seconds between
-- reports, plus room for a slow connection). The game is only returned
-- while the friend is online.
create function public.friend_statuses()
returns table (user_id uuid, game_slug text, last_seen_at timestamptz, is_online boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.user_id,
    case when s.last_seen_at > now() - interval '75 seconds' then s.game_slug end,
    s.last_seen_at,
    s.last_seen_at > now() - interval '75 seconds'
  from public.user_status s
  where s.user_id <> (select auth.uid())
    and public.is_friend_of(s.user_id);
$$;

-- Guests may not call them; signed-in users may.
revoke execute on function public.report_status(text) from public, anon;
revoke execute on function public.friend_statuses() from public, anon;


-- -----------------------------------------------------------------------------
-- 4. Realtime: friends notice "is now playing" right away
-- -----------------------------------------------------------------------------

-- Like the party tables (0006): the launcher is told about changes at once.
-- The rule from section 1 decides who is told about which row.
alter publication supabase_realtime add table public.user_status;
