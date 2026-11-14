-- =============================================================================
-- 0006: PARTIES
-- =============================================================================
--
-- WHAT THIS FILE DOES
--   It lets friends form a "party" in the launcher. The party host picks a
--   multiplayer game, and the launchers of all members open that game
--   together. The game itself then connects the players directly (for
--   example with PeerJS). The database only organises WHO plays WHAT.
--
--   Three tables:
--     parties        one row per party: who is host, which game is running
--     party_members  who is in which party (everybody in at most one party)
--     party_invites  open invitations ("Anna invited you to her party")
--
-- HOW THE "PULLING ALONG" WORKS
--   When the host starts a game, start_party_game() writes the game and a
--   new random session id into the party row. Every member's launcher is
--   told about the change at once (Supabase Realtime, see the end of this
--   file) and opens the same game. The session id becomes the room code the
--   game uses to connect the players.
--
-- WHY FUNCTIONS INSTEAD OF DIRECT WRITES
--   Like friendships (0002), all changes go through functions with clear
--   rules: only friends can be invited, only the host starts games, a party
--   has at most 8 members, and when the host leaves someone else takes over.
--   The website cannot insert or change rows directly.
--
-- The words RLS, policy, security definer etc. are explained at the top of
-- 0001_profiles.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

create table public.parties (
  id uuid primary key default gen_random_uuid(),

  -- The member who starts games. If their account is deleted, the party goes.
  host_id uuid not null references public.profiles (id) on delete cascade,

  -- The game that is running right now (its folder name in games/), or
  -- empty when the party is just hanging out in the launcher.
  game_slug text check (game_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- A new random id for every game start. The launchers notice the change
  -- and the game uses it as its room code.
  session_id uuid,

  created_at timestamptz not null default now()
);

create table public.party_members (
  -- When the party is deleted, its member rows are deleted with it.
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id),
  -- Everybody can be in only ONE party at a time.
  constraint party_members_one_party_per_user unique (user_id)
);

create table public.party_invites (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One invitation per person and party is enough.
  constraint party_invites_once unique (party_id, invitee_id),
  constraint party_invites_not_self check (inviter_id <> invitee_id)
);

-- Speeds up "show me the invitations I received".
create index party_invites_invitee_idx on public.party_invites (invitee_id);


-- -----------------------------------------------------------------------------
-- 2. Helper: "which party am I in?"
-- -----------------------------------------------------------------------------

-- Returns the id of the caller's party, or null. It is used by the rules
-- below. ("security definer" lets it look into party_members without
-- running into the rules of that same table, which would loop forever.)
create function public.my_party_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.party_id from public.party_members m where m.user_id = (select auth.uid());
$$;


-- -----------------------------------------------------------------------------
-- 3. Who may read and delete what
-- -----------------------------------------------------------------------------

alter table public.parties enable row level security;
alter table public.party_members enable row level security;
alter table public.party_invites enable row level security;

-- READ a party: its members, and people who were invited to it (so the
-- invitation can show who the host is).
create policy "Members and invitees see the party"
  on public.parties for select
  to authenticated
  using (
    id = public.my_party_id()
    or exists (
      select 1 from public.party_invites i
      where i.party_id = parties.id and i.invitee_id = (select auth.uid())
    )
  );

-- READ members: only the members of your own party.
create policy "Members see their party's members"
  on public.party_members for select
  to authenticated
  using (party_id = public.my_party_id());

-- READ invitations: the invited person, and the members of the party.
create policy "Invitees and members see invitations"
  on public.party_invites for select
  to authenticated
  using (invitee_id = (select auth.uid()) or party_id = public.my_party_id());

-- DELETE an invitation: the invited person declines, or a party member
-- takes the invitation back.
create policy "Invitees and members delete invitations"
  on public.party_invites for delete
  to authenticated
  using (invitee_id = (select auth.uid()) or party_id = public.my_party_id());

-- Everything else only through the functions below.
revoke insert, update, delete on table public.parties from anon, authenticated;
revoke insert, update, delete on table public.party_members from anon, authenticated;
revoke insert, update on table public.party_invites from anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4. Function: start a party (or get the one you are in)
-- -----------------------------------------------------------------------------

create function public.create_party()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  party uuid := public.my_party_id();
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;
  -- Already in a party: nothing to create.
  if party is not null then
    return party;
  end if;

  insert into public.parties (host_id) values (me) returning id into party;
  insert into public.party_members (party_id, user_id) values (party, me);
  return party;
end;
$$;


-- -----------------------------------------------------------------------------
-- 5. Function: leave the party
-- -----------------------------------------------------------------------------

-- If the host leaves, the member who joined first becomes the new host. If
-- nobody is left, the party (and its open invitations) is deleted.
create function public.leave_party()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  party uuid := public.my_party_id();
  next_host uuid;
begin
  if party is null then
    return;
  end if;

  delete from public.party_members where party_id = party and user_id = me;

  if exists (select 1 from public.parties p where p.id = party and p.host_id = me) then
    select m.user_id into next_host
    from public.party_members m
    where m.party_id = party
    order by m.joined_at
    limit 1;

    if next_host is null then
      delete from public.parties where id = party;
    else
      -- A running game belongs to the old host, so it is stopped.
      update public.parties
      set host_id = next_host, game_slug = null, session_id = null
      where id = party;
    end if;
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- 6. Function: invite a friend
-- -----------------------------------------------------------------------------

-- Creates a party first if the caller has none. Only confirmed friends can
-- be invited (is_friend_of comes from 0002_friendships.sql).
create function public.invite_to_party(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_members constant integer := 8;
  me uuid := (select auth.uid());
  party uuid;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;
  if not public.is_friend_of(target_user) then
    raise exception 'not_friends';
  end if;

  party := public.create_party();

  if exists (
    select 1 from public.party_members m where m.party_id = party and m.user_id = target_user
  ) then
    raise exception 'already_in_party';
  end if;
  if (select count(*) from public.party_members m where m.party_id = party) >= max_members then
    raise exception 'party_full';
  end if;

  -- "on conflict do nothing": inviting the same friend twice is harmless.
  insert into public.party_invites (party_id, inviter_id, invitee_id)
  values (party, me, target_user)
  on conflict (party_id, invitee_id) do nothing;
end;
$$;


-- -----------------------------------------------------------------------------
-- 7. Function: accept an invitation
-- -----------------------------------------------------------------------------

-- Joining a party means leaving the one you were in before.
create function public.accept_party_invite(invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_members constant integer := 8;
  me uuid := (select auth.uid());
  invite public.party_invites;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;

  -- Only the invited person can accept. If the party was deleted in the
  -- meantime, the invitation is gone too.
  select * into invite
  from public.party_invites i
  where i.id = invite_id and i.invitee_id = me;
  if not found then
    raise exception 'invite_not_found';
  end if;

  if public.my_party_id() is distinct from invite.party_id then
    if (select count(*) from public.party_members m where m.party_id = invite.party_id) >= max_members then
      raise exception 'party_full';
    end if;
    perform public.leave_party();
    insert into public.party_members (party_id, user_id) values (invite.party_id, me);
  end if;

  delete from public.party_invites where id = invite.id;
  return invite.party_id;
end;
$$;


-- -----------------------------------------------------------------------------
-- 8. Functions: the host starts and stops a game
-- -----------------------------------------------------------------------------

-- Returns the new session id. The launchers of all members react to the
-- change and open the game.
create function public.start_party_game(p_game_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  party uuid := public.my_party_id();
  new_session uuid := gen_random_uuid();
begin
  if party is null then
    raise exception 'no_party';
  end if;
  if not exists (select 1 from public.parties p where p.id = party and p.host_id = me) then
    raise exception 'not_host';
  end if;
  if p_game_slug is null or p_game_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_game';
  end if;

  update public.parties
  set game_slug = p_game_slug, session_id = new_session
  where id = party;
  return new_session;
end;
$$;

-- Called when the host leaves the game. Does nothing for other members.
create function public.stop_party_game()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.parties
  set game_slug = null, session_id = null
  where id = public.my_party_id() and host_id = (select auth.uid());
end;
$$;

-- Guests may not call any of these; signed-in users may.
revoke execute on function public.create_party() from public, anon;
revoke execute on function public.leave_party() from public, anon;
revoke execute on function public.invite_to_party(uuid) from public, anon;
revoke execute on function public.accept_party_invite(uuid) from public, anon;
revoke execute on function public.start_party_game(text) from public, anon;
revoke execute on function public.stop_party_game() from public, anon;


-- -----------------------------------------------------------------------------
-- 9. Realtime: tell the launchers about changes immediately
-- -----------------------------------------------------------------------------

-- Supabase Realtime sends a message to the website whenever a row in these
-- tables changes. The rules from section 3 still apply: a user is only told
-- about rows they are allowed to read. Without this, the launcher would
-- only notice new invitations and game starts when it asks again (every
-- 20 seconds).
alter publication supabase_realtime add table public.parties, public.party_members, public.party_invites;
