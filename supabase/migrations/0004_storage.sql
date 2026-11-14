-- =============================================================================
-- 0004: STORAGE FOR AVATARS
-- =============================================================================
--
-- WHAT THIS FILE DOES
--   Supabase Storage is a file store next to the database. We use it for
--   exactly one thing: profile pictures. (Game covers and screenshots are
--   NOT stored here. They live in the repository, inside each game's folder.)
--
--   Files are grouped in "buckets" (think: top-level folders). This file
--   creates the bucket "avatars" and decides who may upload what.
--
-- HOW THE FILES ARE ORGANISED
--   Every user gets their own folder, named after their user id:
--     avatars/<user id>/avatar.webp
--   The rules below check that folder name. So a user can only ever write
--   into their own folder, never into someone else's.
--
-- The words RLS, policy etc. are explained at the top of 0001_profiles.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. The bucket
-- -----------------------------------------------------------------------------

-- Buckets are rows in Supabase's own table "storage.buckets".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  -- public = true: anyone who knows the link can VIEW a picture, without
  -- signing in. That is what we want, avatars are shown everywhere.
  -- It does NOT mean that anyone can upload.
  true,
  -- Largest allowed file: 1 MB (1048576 bytes). The website shrinks pictures
  -- before uploading, so this is plenty.
  1048576,
  -- Only real image formats are accepted, nothing else.
  array['image/png', 'image/jpeg', 'image/webp']
)
-- If the bucket already exists, do nothing instead of failing.
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- 2. Who may upload, replace and delete
-- -----------------------------------------------------------------------------

-- Files are rows in Supabase's table "storage.objects", which already has
-- Row Level Security switched on. Without the policies below, nobody could
-- upload anything.
--
-- The condition is the same in all three policies:
--   bucket_id = 'avatars'
--       the rule only applies to our avatars bucket
--   (storage.foldername(name))[1] = (select auth.uid())::text
--       "name" is the path of the file inside the bucket, for example
--       "1a2b.../avatar.webp". storage.foldername() splits off the folders,
--       [1] takes the first one. It must equal the id of the signed-in user.

-- UPLOAD a new picture into your own folder.
create policy "Users upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- REPLACE an existing picture in your own folder.
create policy "Users update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- DELETE a picture in your own folder.
create policy "Users delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
