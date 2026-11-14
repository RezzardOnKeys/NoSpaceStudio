import { toProfile } from '@/features/profile/api';
import { getSupabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import type { FriendGamePlaytime, PlaytimeEntry } from '@/types/models';

/*
 * Reading playtime. Writing it (the heartbeat while playing) arrives with
 * phase 4. Row Level Security only returns the signed-in user's own rows and
 * those of confirmed friends.
 */

function toPlaytimeEntry(row: Tables<'playtime'>): PlaytimeEntry {
  return {
    // Games are identified by their folder name (slug).
    gameId: row.game_slug,
    totalSeconds: row.total_seconds,
    lastPlayedAt: row.last_played_at,
  };
}

export async function fetchPlaytimeOfUser(userId: string): Promise<PlaytimeEntry[]> {
  const { data, error } = await getSupabase()
    .from('playtime')
    .select('*')
    .eq('user_id', userId)
    .order('last_played_at', { ascending: false });
  if (error) throw error;
  return data.map(toPlaytimeEntry);
}

/** True when the signed-in user and this player are confirmed friends. */
export async function isFriendOf(userId: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('is_friend_of', { other_user: userId });
  if (error) throw error;
  return data;
}

/** Friends who played a game, most playtime first. */
export async function fetchFriendsPlaytimeForGame(
  gameSlug: string,
  myId: string,
): Promise<FriendGamePlaytime[]> {
  const { data, error } = await getSupabase()
    .from('playtime')
    .select('total_seconds, profile:profiles(*)')
    .eq('game_slug', gameSlug)
    .neq('user_id', myId)
    .gt('total_seconds', 0)
    .order('total_seconds', { ascending: false });
  if (error) throw error;

  return data.flatMap((row) =>
    row.profile ? [{ profile: toProfile(row.profile), totalSeconds: row.total_seconds }] : [],
  );
}

/**
 * Heartbeat from the player: adds the seconds played since the last call.
 * The database caps what one call can add (see record_playtime in
 * supabase/migrations/0003_playtime.sql), so a wrong number cannot cheat.
 */
export async function recordPlaytime(gameSlug: string, seconds: number): Promise<void> {
  const { error } = await getSupabase().rpc('record_playtime', {
    p_game_slug: gameSlug,
    p_seconds: Math.round(seconds),
  });
  if (error) throw error;
}
