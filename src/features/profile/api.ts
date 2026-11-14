import { getSupabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import type { Profile } from '@/types/models';

const AVATAR_BUCKET = 'avatars';

/** The database stores the picture's path in the bucket; the app needs a link. */
function avatarUrl(path: string | null): string | null {
  if (!path) return null;
  return getSupabase().storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function toProfile(row: Tables<'profiles'>): Profile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: avatarUrl(row.avatar_url),
    createdAt: row.created_at,
  };
}

export async function fetchProfileById(userId: string): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This account has no profile.');
  return toProfile(data);
}

/** Returns null when no user has this username. */
export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data) : null;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  return (await fetchProfileByUsername(username)) !== null;
}

/** Supabase answers this way when the file already exists. */
function isAlreadyUploaded(error: { message: string; statusCode?: string }): boolean {
  return error.statusCode === '409' || /already exists|duplicate/i.test(error.message);
}

/**
 * Uploads the profile picture and saves it in the profile. Works only once
 * per account: the database refuses to replace or delete the file afterwards
 * (see supabase/migrations/0005_one_time_avatar.sql).
 */
export async function uploadAvatar(userId: string, image: Blob): Promise<void> {
  const supabase = getSupabase();
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(`${userId}/avatar`, image, { contentType: image.type, upsert: false });

  // An earlier attempt may have uploaded the file and then lost the
  // connection before saving it in the profile. Then only the second step is left.
  if (uploadError && !isAlreadyUploaded(uploadError)) throw uploadError;

  const { error } = await supabase.rpc('set_avatar');
  if (error) throw error;
}

const AVATAR_ERROR_MESSAGES: Record<string, string> = {
  avatar_already_set: 'You already have a profile picture. It cannot be changed.',
};

export function describeAvatarError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return (
    AVATAR_ERROR_MESSAGES[message] ?? 'The upload failed. Check your connection and try again.'
  );
}
