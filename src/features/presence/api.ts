import { getSupabase } from '@/lib/supabase';
import type { FriendStatus } from '@/types/models';

/*
 * Online status (supabase/migrations/0008_online_status.sql). The launcher
 * reports in every 30 seconds; whether a friend counts as online is decided
 * by the database, so wrong clocks do not matter.
 */

/** "I am here", with the game that is open right now (or null). */
export async function reportStatus(gameSlug: string | null): Promise<void> {
  const { error } = await getSupabase().rpc('report_status', { p_game_slug: gameSlug });
  if (error) throw error;
}

/** The status of every friend who has opened the launcher before, by user id. */
export async function fetchFriendStatuses(): Promise<Map<string, FriendStatus>> {
  const { data, error } = await getSupabase().rpc('friend_statuses');
  if (error) throw error;

  return new Map(
    data.map((row) => [
      row.user_id,
      {
        userId: row.user_id,
        state: !row.is_online ? 'offline' : row.game_slug ? 'playing' : 'online',
        gameSlug: row.game_slug,
        lastSeenAt: row.last_seen_at,
      } satisfies FriendStatus,
    ]),
  );
}
