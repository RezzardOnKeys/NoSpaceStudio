-- =============================================================================
-- 0001: PROFILES
-- =============================================================================
--
-- WHAT THIS FILE DOES
--   It creates the table "profiles": one row per account, holding what other
--   players may see (username and avatar). It also makes sure that such a row
--   is created automatically whenever someone signs up.
--
-- HOW ACCOUNTS WORK IN SUPABASE
--   Supabase stores the secret part of an account (email, password hash) in
--   its own table "auth.users". We never touch that table directly and the
--   website can never read it. Everything public about a user goes into OUR
--   table "public.profiles". Both rows share the same id.
--
-- WORDS YOU WILL SEE IN ALL OUR SQL FILES
--   table       A list of rows, like a spreadsheet. Columns have fixed types.
--   primary key The column that identifies a row. No two rows share its value.
--   references  "This value must exist in that other table" (a foreign key).
--   check       A rule every row must pass, otherwise the database refuses it.
--   RLS         Row Level Security. Once switched on, NOBODY can read or write
--               a row unless a "policy" explicitly allows it. This is the
--               main protection: the website talks to the database directly,
--               so the database itself must decide who may do what.
--   policy      One rule for RLS, e.g. "users may update their own row".
--   anon        The role of a visitor who is NOT signed in.
--   authenticated  The role of a visitor who IS signed in.
--   auth.uid()  The id of the user who is making the request (null for guests).
--   function    A piece of logic stored in the database that the website can
--               call (Supabase calls this an RPC).
--   trigger     Logic that runs automatically when a row is added or changed.
--
-- HOW TO RUN IT
--   Supabase dashboard -> SQL Editor -> paste the whole file -> Run.
--   Run each numbered file exactly once, in order. See docs/SUPABASE-SETUP.md.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. The table
-- -----------------------------------------------------------------------------

create table public.profiles (
  -- Same id as the account in auth.users. "on delete cascade" means: when
  -- the account is deleted, this profile is deleted with it.
  id uuid primary key references auth.users (id) on delete cascade,

  -- The public name. "unique" = no two users can have the same one.
  -- The check only allows 3 to 20 characters out of a-z, 0-9 and "_".
  -- Because capital letters are not allowed at all, "Max" and "max" can never
  -- exist side by side: names are case-insensitive.
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),

  -- Link to the profile picture in Supabase Storage. Empty (null) = no picture.
  avatar_url text,

  -- When the account was created. Filled in automatically.
  created_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 2. Who may read and write profiles
-- -----------------------------------------------------------------------------

-- Switch on Row Level Security. From here on everything is forbidden until a
-- policy below allows it.
alter table public.profiles enable row level security;

-- READ: everybody, signed in or not. Usernames and avatars are public
-- (profile pages, friend search). "using (true)" means "for every row".
create policy "Profiles are readable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- CHANGE: a signed-in user may change a row only if it is their own.
-- "using" picks the rows they may touch, "with check" is tested against the
-- row after the change (so they cannot turn it into someone else's row).
create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- A second, stricter lock on top of the policy: column privileges.
-- Supabase gives the roles anon and authenticated full table rights by
-- default and relies on RLS alone. We take the write rights away ...
revoke insert, update, delete on table public.profiles from anon, authenticated;
-- ... and hand back exactly one: changing the avatar. Result:
--   * the username cannot be changed after sign-up,
--   * id and created_at cannot be changed,
--   * profiles cannot be created or deleted by the website (only by the
--     trigger below, and by deleting the account).
grant update (avatar_url) on table public.profiles to authenticated;


-- -----------------------------------------------------------------------------
-- 3. Create the profile automatically on sign-up
-- -----------------------------------------------------------------------------

-- The sign-up form sends the chosen username along as "user metadata".
-- Supabase stores it in auth.users.raw_user_meta_data. This function reads it
-- from there and creates the profile row.
--
-- "security definer" = the function runs with the rights of its owner (the
-- database admin), not with the rights of the visitor. That is needed because
-- visitors are not allowed to insert into profiles (see above).
-- "set search_path = ''" is a safety habit for such functions: every table
-- must be written with its schema (public.profiles), so nobody can trick the
-- function into using a different table with the same name.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- "new" is the account row that is being created right now.
  wanted text := lower(trim(new.raw_user_meta_data ->> 'username'));
begin
  if wanted is null or wanted = '' then
    -- No username was sent. That only happens when an account is created by
    -- hand in the Supabase dashboard. Give it a generated name like
    -- "player_1a2b3c4d5e6f" so the account still gets a profile.
    wanted := 'player_' || substr(replace(new.id::text, '-', ''), 1, 12);
  elsif wanted !~ '^[a-z0-9_]{3,20}$' then
    -- A username was sent but breaks the rules. Stop with an error.
    raise exception 'invalid_username'
      using hint = 'Usernames have 3 to 20 characters: a-z, 0-9 and _.';
  end if;

  -- If the name is already taken, this insert fails ("unique" on username).
  -- The error cancels the whole sign-up, so there is never an account
  -- without a profile, and never two users with the same name, even if two
  -- people pick the same name in the same second.
  insert into public.profiles (id, username) values (new.id, wanted);
  return new;
end;
$$;

-- Run the function after every new row in auth.users (= every sign-up).
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
