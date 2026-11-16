-- =============================================================================
-- 0009: ONLINE ONLY WHILE ACTIVE, LEAVE THE PARTY WHEN OFFLINE
-- =============================================================================
--
-- WHAT THIS FILE DOES
--   1. "Online" now means: the player is really using the launcher or a
--      game. Until now an open tab somewhere in the background kept a
--      player online forever, because the tab kept reporting in. Now the
--      launcher stops reporting while its tab is hidden or nobody has
--      touched it for a while, and says "I am away" once (report_away).
--      The new column "active" remembers that, so friends see "Offline"
--      right away instead of after 75 seconds.
--   2. A player who is offline for more than 3 minutes leaves their party
--      automatically. If that player was the host, the member who joined
--      first becomes the new host (the same rule as leaving by hand, see
--      leave_party in 0006). Nobody has to be online for this to run at an
--      exact moment: every report of any player tidies up all parties, and
--      a player who comes back after a long break leaves the party before
--      they count as online again.
--
-- NOTHING OLD IS CHANGED BY HAND
--   0006 and 0008 may already have been run in Supabase, so they stay as
--   they are. This file adds one column and replaces two functions
--   (report_status, friend_statuses) with "create or replace", which keeps
--   their names, so the launcher keeps working while you run it.
--
-- The words RLS, policy, security definer etc. are explained at the top of
-- 0001_profiles.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. New column: is the player active right now?
-- -----------------------------------------------------------------------------

-- true  = the launcher reported "I am here" (report_status)
-- false = it reported "I am away" (report_away): tab hidden, nobody at the
--         keyboard, or the tab was closed.
-- Old rows get true, so nothing changes for them until their next report.
alter table public.user_status
  add column active boolean not null default true;


-- -----------------------------------------------------------------------------
-- 2. Function: take players out of their party when they are offline
-- -----------------------------------------------------------------------------

-- Removes one player from their party, with the same rules as leave_party
-- (0006): if they were the host, the member who joined first becomes the
-- new host and a running game is stopped; if nobody is left, the party is
-- deleted. Only the database itself uses this function (see section 5).
create function public.remove_from_party(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  party uuid;
  next_host uuid;
begin
  select m.party_id into party from public.party_members m where m.user_id = p_user;
  if party is null then
    return;
  end if;

  delete from public.party_members where party_id = party and user_id = p_user;

  if exists (select 1 from public.parties p where p.id = party and p.host_id = p_user) then
    select m.user_id into next_host
    from public.party_members m
    where m.party_id = party
    order by m.joined_at
    limit 1;

    if next_host is null then
      delete from public.parties where id = party;
    else
      update public.parties
      set host_id = next_host, game_slug = null, session_id = null
      where id = party;
    end if;
  end if;
end;
$$;

-- Goes through all party members and removes everybody whose last report
-- (or "I am away") is more than 3 minutes old. The 3 minutes are a grace
-- time: a quick look at another tab, a reload or a short drop of the
-- internet connection does not throw anybody out of their party.
-- A member who never reported at all is left alone (that cannot happen
-- with the current launcher, which reports as soon as it opens).
create function public.clean_up_parties()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale uuid;
begin
  for stale in
    select m.user_id
    from public.party_members m
    join public.user_status s on s.user_id = m.user_id
    where s.last_seen_at < now() - interval '3 minutes'
  loop
    perform public.remove_from_party(stale);
  end loop;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. Function: "I am here" (replaces the one from 0008)
-- -----------------------------------------------------------------------------

-- Same as before, plus: it tidies up the parties first. Because that runs
-- before the caller's own row is updated, a player who comes back after
-- more than 3 minutes away also leaves their old party now.
create or replace function public.report_status(p_game_slug text)
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

  perform public.clean_up_parties();

  insert into public.user_status (user_id, game_slug, last_seen_at, active)
  values (me, p_game_slug, now(), true)
  on conflict (user_id) do update
    set game_slug = excluded.game_slug, last_seen_at = excluded.last_seen_at, active = true;
end;
$$;


-- -----------------------------------------------------------------------------
-- 4. Function: "I am away" (new)
-- -----------------------------------------------------------------------------

-- Called by the launcher when its tab has been hidden for a moment, when
-- nobody has used it for a while, or when the tab closes. The player counts
-- as offline at once; "last seen" is this moment. The party is not left
-- yet: that happens after the 3 minutes of section 2.
create function public.report_away()
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

  insert into public.user_status (user_id, game_slug, last_seen_at, active)
  values (me, null, now(), false)
  on conflict (user_id) do update
    set game_slug = null, last_seen_at = excluded.last_seen_at, active = false;
end;
$$;


-- -----------------------------------------------------------------------------
-- 5. Function: the status of all my friends (replaces the one from 0008)
-- -----------------------------------------------------------------------------

-- A friend is online while they are active and their last report is less
-- than 75 seconds old (a closed tab that could not say "I am away" still
-- goes offline after 75 seconds, as before).
create or replace function public.friend_statuses()
returns table (user_id uuid, game_slug text, last_seen_at timestamptz, is_online boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.user_id,
    case when s.active and s.last_seen_at > now() - interval '75 seconds' then s.game_slug end,
    s.last_seen_at,
    s.active and s.last_seen_at > now() - interval '75 seconds'
  from public.user_status s
  where s.user_id <> (select auth.uid())
    and public.is_friend_of(s.user_id);
$$;


-- -----------------------------------------------------------------------------
-- 6. Who may call what
-- -----------------------------------------------------------------------------

-- Signed-in users may say "I am away"; guests may not.
revoke execute on function public.report_away() from public, anon;
-- The two helpers of section 2 are only for the database itself: nobody
-- may throw others out of a party by calling them.
revoke execute on function public.remove_from_party(uuid) from public, anon, authenticated;
revoke execute on function public.clean_up_parties() from public, anon, authenticated;
