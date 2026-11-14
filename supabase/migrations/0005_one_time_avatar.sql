-- =============================================================================
-- 0005: PROFILE PICTURE CAN ONLY BE CHOSEN ONCE
-- =============================================================================
--
-- WHAT THIS FILE DOES
--   Until now (files 0001 and 0004) a user could change and delete their
--   profile picture as often as they liked. This file changes the rules:
--   every user can choose a profile picture exactly ONCE. After that it can
--   neither be replaced nor removed, not even with tricks, because the
--   database itself refuses it.
--
-- HOW IT WORKS
--   1. The picture always has the same name: avatars/<user id>/avatar
--      A file name can only exist once. Since nobody may overwrite or delete
--      files anymore, the first upload is the last one.
--   2. After the upload the website calls the function set_avatar(). It
--      writes the file's path into the profile, but only if the profile has
--      no picture yet.
--   3. Users can no longer write to the profiles table at all.
--
-- WHAT IF A PICTURE MUST GO (e.g. something offensive)?
--   Only by hand in the Supabase dashboard, see docs/SUPABASE-SETUP.md,
--   section "Ein Profilbild entfernen".
--
-- WHY A NEW FILE AND NOT A CHANGE TO 0001 / 0004?
--   Those files have already been run in our Supabase project. Running a
--   changed copy again would fail ("already exists"). Changes to an existing
--   database always go into a new numbered file.
--
-- The words RLS, policy, security definer etc. are explained at the top of
-- 0001_profiles.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Profiles: users can no longer change anything themselves
-- -----------------------------------------------------------------------------

-- 0001 allowed users to change the avatar_url column of their own row.
-- Take that right away again ...
revoke update (avatar_url) on table public.profiles from authenticated;

-- ... and remove the policy that allowed updates of the own row. Without
-- any update policy, no user can change any profile row.
drop policy "Users update their own profile" on public.profiles;

-- From now on avatar_url holds the PATH of the picture inside the avatars
-- bucket (for example '1a2b...-.../avatar'), not a full web address. The
-- website turns the path into a link. That way the column can never point
-- to an image on some other website.
comment on column public.profiles.avatar_url is
  'Path of the profile picture in the avatars bucket. Set once by set_avatar(), then fixed.';


-- -----------------------------------------------------------------------------
-- 2. Function: save the uploaded picture in the profile (once)
-- -----------------------------------------------------------------------------

-- Called by the website right after the upload. It takes no input: the path
-- is always built from the caller's own id, so nobody can put someone
-- else's picture (or anything else) into their profile.
create function public.set_avatar()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  saved_path text;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;

  -- "and avatar_url is null" is the important part: the row is only changed
  -- when there is no picture yet.
  update public.profiles
  set avatar_url = me::text || '/avatar'
  where id = me and avatar_url is null
  returning avatar_url into saved_path;

  -- Nothing was changed: the user already has a picture.
  if not found then
    raise exception 'avatar_already_set';
  end if;

  return saved_path;
end;
$$;

-- Guests may not call it; signed-in users may.
revoke execute on function public.set_avatar() from public, anon;


-- -----------------------------------------------------------------------------
-- 3. Storage: upload once, never replace or delete
-- -----------------------------------------------------------------------------

-- Remove the three rules from 0004 that allowed uploading any file name,
-- replacing and deleting.
drop policy "Users upload their own avatar" on storage.objects;
drop policy "Users update their own avatar" on storage.objects;
drop policy "Users delete their own avatar" on storage.objects;

-- The only rule left: a signed-in user may upload ONE file, and its path
-- must be exactly '<their own id>/avatar'. There is deliberately no update
-- and no delete rule, so once the file exists it stays as it is.
create policy "Users upload their avatar once"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name = (select auth.uid())::text || '/avatar'
  );
