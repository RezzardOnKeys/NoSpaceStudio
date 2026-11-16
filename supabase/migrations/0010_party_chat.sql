-- =============================================================================
-- 0010: PARTY CHAT
-- =============================================================================
--
-- WHAT THIS FILE DOES
--   Members of a party can write short text messages to each other. The
--   chat is shown only on the Party page of the launcher.
--
--   One new table:
--     party_messages  one row per message: which party, who wrote it, the text
--
-- WHO SEES WHAT
--   Only the members of a party read its messages, and only the messages
--   written since they joined. Somebody who joins later does not read what
--   was said before. Somebody who leaves (or is removed) cannot read the
--   chat any more.
--
-- HOW LONG MESSAGES ARE KEPT
--   Messages belong to their party. When the party ends (the last member
--   leaves, also automatically after 3 minutes offline, see 0009), all its
--   messages are deleted with it. In a party that runs for a long time,
--   messages older than 24 hours are deleted whenever somebody writes.
--
-- WHY A FUNCTION FOR WRITING
--   Like everything else in parties (0006), writing goes through a function
--   with clear rules: you must be in the party, the text must not be empty
--   or longer than 500 characters, and at most 5 messages in 10 seconds (so
--   nobody can flood the chat). The website cannot insert rows directly.
--
-- NOTHING OLD IS CHANGED
--   This file only adds new things. my_party_id() comes from 0006.
--
-- The words RLS, policy, security definer etc. are explained at the top of
-- 0001_profiles.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Table
-- -----------------------------------------------------------------------------

create table public.party_messages (
  -- "bigint generated always as identity" = a number that counts up by
  -- itself (1, 2, 3, ...). Newer messages have bigger numbers.
  id bigint generated always as identity primary key,

  -- When the party is deleted, its messages are deleted with it.
  party_id uuid not null references public.parties (id) on delete cascade,

  -- The writer. If their account is deleted, their messages go too.
  user_id uuid not null references public.profiles (id) on delete cascade,

  -- The text. The function below trims spaces at both ends first, so this
  -- check also catches a message made only of spaces.
  body text not null check (char_length(body) between 1 and 500),

  created_at timestamptz not null default now()
);

-- Speeds up "the newest messages of this party", the only question the
-- launcher asks.
create index party_messages_party_created_idx
  on public.party_messages (party_id, created_at desc);


-- -----------------------------------------------------------------------------
-- 2. Who may read what
-- -----------------------------------------------------------------------------

alter table public.party_messages enable row level security;

-- READ: messages of your own party, written since you joined it.
-- (A member row of your own party is readable for you, see 0006, so the
-- inner question works under the normal rules.)
create policy "Members read their party's messages since they joined"
  on public.party_messages for select
  to authenticated
  using (
    party_id = public.my_party_id()
    and created_at >= (
      select m.joined_at from public.party_members m
      where m.user_id = (select auth.uid())
    )
  );

-- Writing, changing and deleting only through the function below (and
-- the automatic deletion with the party). Messages cannot be edited.
revoke insert, update, delete on table public.party_messages from anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. Function: send a message
-- -----------------------------------------------------------------------------

create function public.send_party_message(p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_length constant integer := 500;
  -- At most this many messages ...
  burst_limit constant integer := 5;
  -- ... within this time.
  burst_window constant interval := interval '10 seconds';
  -- Messages older than this are tidied away.
  keep_for constant interval := interval '24 hours';

  me uuid := (select auth.uid());
  party uuid := public.my_party_id();
  clean_body text := btrim(coalesce(p_body, ''));
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;
  if party is null then
    raise exception 'no_party';
  end if;
  if clean_body = '' then
    raise exception 'empty_message';
  end if;
  if char_length(clean_body) > max_length then
    raise exception 'message_too_long';
  end if;

  if (
    select count(*) from public.party_messages pm
    where pm.party_id = party
      and pm.user_id = me
      and pm.created_at > now() - burst_window
  ) >= burst_limit then
    raise exception 'too_fast';
  end if;

  insert into public.party_messages (party_id, user_id, body)
  values (party, me, clean_body);

  -- Tidy up: old messages of this party are not needed any more.
  delete from public.party_messages pm
  where pm.party_id = party and pm.created_at < now() - keep_for;
end;
$$;

-- Guests may not call it; signed-in users may.
revoke execute on function public.send_party_message(text) from public, anon;


-- -----------------------------------------------------------------------------
-- 4. Realtime: new messages appear immediately
-- -----------------------------------------------------------------------------

-- Like the other party tables (0006): the launcher is told about every new
-- message right away. The rule from section 2 still applies, so a user is
-- only told about messages they are allowed to read.
alter publication supabase_realtime add table public.party_messages;
