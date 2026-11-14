-- =============================================================================
-- 0007: PARTY HOST TOOLS (kick a member, make someone else host)
-- =============================================================================
--
-- WHAT THIS FILE DOES
--   It adds two functions for the party host (parties are set up in
--   0006_parties.sql):
--     kick_party_member(user)    removes a member from the party
--     transfer_party_host(user)  makes another member the new host
--   Only the current host may call them. Everybody else gets an error.
--
-- WHY A NEW FILE
--   0006 has already been run in our Supabase project. Changes always go
--   into a new numbered file (see the top of 0005_one_time_avatar.sql).
--
-- The words RLS, policy, security definer etc. are explained at the top of
-- 0001_profiles.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Function: kick a member
-- -----------------------------------------------------------------------------

-- The kicked player's launcher notices it right away (Realtime) and shows
-- that they are no longer in the party. They can be invited again later.
create function public.kick_party_member(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  party uuid := public.my_party_id();
begin
  if party is null then
    raise exception 'no_party';
  end if;
  if not exists (select 1 from public.parties p where p.id = party and p.host_id = me) then
    raise exception 'not_host';
  end if;
  -- The host leaves with leave_party() instead, so somebody takes over.
  if target_user = me then
    raise exception 'cannot_kick_yourself';
  end if;

  delete from public.party_members
  where party_id = party and user_id = target_user;

  -- No row was deleted: that player is not in this party.
  if not found then
    raise exception 'not_member';
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. Function: make another member the host
-- -----------------------------------------------------------------------------

-- A game the old host started is stopped, because the new host decides
-- what is played next (same as when the host leaves, see 0006).
create function public.transfer_party_host(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  party uuid := public.my_party_id();
begin
  if party is null then
    raise exception 'no_party';
  end if;
  if not exists (select 1 from public.parties p where p.id = party and p.host_id = me) then
    raise exception 'not_host';
  end if;
  -- Already the host: nothing to do.
  if target_user = me then
    return;
  end if;
  if not exists (
    select 1 from public.party_members m where m.party_id = party and m.user_id = target_user
  ) then
    raise exception 'not_member';
  end if;

  update public.parties
  set host_id = target_user, game_slug = null, session_id = null
  where id = party;
end;
$$;

-- Guests may not call them; signed-in users may (the functions check that
-- the caller is the host).
revoke execute on function public.kick_party_member(uuid) from public, anon;
revoke execute on function public.transfer_party_host(uuid) from public, anon;
