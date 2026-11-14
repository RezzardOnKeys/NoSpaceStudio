import { getSupabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import type { Profile } from '@/types/models';

export function toProfile(row: Tables<'profiles'>): Profile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
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
