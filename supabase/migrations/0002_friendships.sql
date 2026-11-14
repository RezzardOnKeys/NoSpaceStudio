-- =============================================================================
-- 0002: FRIENDSHIPS
-- =============================================================================
--
-- WHAT THIS FILE DOES
--   It creates the table "friendships" and the logic around it. One row
--   stands for one pair of users:
--     status 'pending'  = an open friend request (requester asked addressee)
--     status 'accepted' = the two are friends
--   There is no 'declined' status: declining a request, cancelling one and
--   removing a friend all simply delete the row.
--
-- WHY FUNCTIONS INSTEAD OF DIRECT WRITES
--   The website may not insert or change rows here directly. Sending and
--   accepting a request go through the two functions at the bottom, because
--   they need rules a simple policy cannot express well ("you cannot accept
--   your own request", "if they already asked you, become friends at once").
--
-- The words RLS, policy, security definer etc. are explained at the top of
-- 0001_profiles.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. The table
-- -----------------------------------------------------------------------------

create table public.friendships (
  -- A random id for the row, generated automatically.
  id uuid primary key default gen_random_uuid(),

  -- Who sent the request and who received it. Both must be existing
  -- profiles; if one of them deletes their account, the row disappears too.
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,

  status text not null default 'pending' check (status in ('pending', 'accepted')),

  -- When the request was sent, and when it was accepted (empty until then).
  created_at timestamptz not null default now(),
  accepted_at timestamptz,

  -- Nobody can befriend themselves.
  constraint friendships_not_self check (requester_id <> addressee_id)
);

-- Each pair of users may exist only once, no matter who asked whom.
-- least()/greatest() put the two ids in a fixed order, so the pairs
-- (Anna, Ben) and (Ben, Anna) count as the same pair and the second one is
-- refused.
create unique index friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- An index is a lookup aid that makes searches fast. This one speeds up
-- "show me the requests I received".
create index friendships_addressee_idx on public.friendships (addressee_id);


-- -----------------------------------------------------------------------------
-- 2. Who may read and write friendships
-- -----------------------------------------------------------------------------

alter table public.friendships enable row level security;

-- READ: only the two users involved see a friendship or request.
-- Guests (anon) get no policy at all, so they see nothing.
create policy "Users see their own friendships"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- DELETE: either of the two may delete the row. This one rule covers
-- declining a request, cancelling your own request and removing a friend.
create policy "Users delete their own friendships"
  on public.friendships for delete
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- No direct inserts or updates from the website. Only the functions below
-- (which run with admin rights) create and accept requests.
revoke insert, update on table public.friendships from anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. Helper: "is this user my friend?"
-- -----------------------------------------------------------------------------

-- Returns true when the calling user and other_user are confirmed friends.
-- It is used by the playtime rules in 0003 ("friends may see my playtime").
-- It only ever answers about the CALLER's own friendships, so it cannot be
-- used to spy on who else is friends with whom.
-- "stable" tells the database that the function only reads data.
create function public.is_friend_of(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = (select auth.uid()) and f.addressee_id = other_user)
        or (f.addressee_id = (select auth.uid()) and f.requester_id = other_user)
      )
  );
$$;


-- -----------------------------------------------------------------------------
-- 4. Function: send a friend request
-- -----------------------------------------------------------------------------

-- The website calls this with the id of the user to befriend. It returns the
-- friendship row (pending or accepted).
create function public.send_friend_request(target_user uuid)
returns public.friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());      -- the caller
  existing public.friendships;         -- a row for this pair, if there is one
  result public.friendships;
begin
  -- Guests cannot send requests.
  if me is null then
    raise exception 'not_signed_in';
  end if;
  if target_user = me then
    raise exception 'cannot_befriend_yourself';
  end if;
  if not exists (select 1 from public.profiles p where p.id = target_user) then
    raise exception 'user_not_found';
  end if;

  -- Is there already a row for the two of us (in either direction)?
  select * into existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(me, target_user)
    and greatest(f.requester_id, f.addressee_id) = greatest(me, target_user);

  if found then
    -- The other user already asked ME: accept their request right away
    -- instead of creating a second one.
    if existing.status = 'pending' and existing.addressee_id = me then
      update public.friendships
      set status = 'accepted', accepted_at = now()
      where id = existing.id
      returning * into result;
      return result;
    end if;
    -- Otherwise (I already asked, or we are friends): nothing to do.
    return existing;
  end if;

  -- No row yet: create the request. Status defaults to 'pending'.
  insert into public.friendships (requester_id, addressee_id)
  values (me, target_user)
  returning * into result;
  return result;
end;
$$;


-- -----------------------------------------------------------------------------
-- 5. Function: accept a friend request
-- -----------------------------------------------------------------------------

-- The website calls this with the id of the request. Only the user who
-- RECEIVED the request can accept it (addressee_id = me), and only while it
-- is still pending.
create function public.accept_friend_request(request_id uuid)
returns public.friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  result public.friendships;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;

  update public.friendships
  set status = 'accepted', accepted_at = now()
  where id = request_id and addressee_id = me and status = 'pending'
  returning * into result;

  -- No row was changed: the request does not exist, is not addressed to the
  -- caller, or was already accepted.
  if not found then
    raise exception 'request_not_found';
  end if;
  return result;
end;
$$;

-- By default everyone may call a new function. Take that right away from
-- guests; signed-in users keep it. (The functions check for a signed-in user
-- themselves as well. Two locks are better than one.)
revoke execute on function public.send_friend_request(uuid) from public, anon;
revoke execute on function public.accept_friend_request(uuid) from public, anon;
