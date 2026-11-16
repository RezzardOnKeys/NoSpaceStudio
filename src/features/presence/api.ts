import { env } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import type { FriendStatus } from '@/types/models';

/*
 * Online status (supabase/migrations/0008_online_status.sql and
 * 0009_active_status_and_party_cleanup.sql). While someone really uses the
 * launcher it reports in every 30 seconds; when they stop, it says "I am
 * away" once. Whether a friend counts as online is decided by the database,
 * so wrong clocks do not matter.
 */

/** "I am here", with the game that is open right now (or null). */
export async function reportStatus(gameSlug: string | null): Promise<void> {
  const { error } = await getSupabase().rpc('report_status', { p_game_slug: gameSlug });
  if (error) throw error;
}

/** "I am away": friends see "Offline" at once. */
export async function reportAway(): Promise<void> {
  const { error } = await getSupabase().rpc('report_away');
  if (error) throw error;
}

/**
 * "I am away" while the tab is closing. A normal request would be cancelled
 * together with the page, so this uses `keepalive`, which lets the browser
 * finish it in the background. It needs the current access token, because
 * there is no time left to ask Supabase for it.
 */
export function reportAwayOnClose(accessToken: string): void {
  if (!env.isSupabaseConfigured) return;
  void fetch(`${env.supabaseUrl}/rest/v1/rpc/report_away`, {
    method: 'POST',
    keepalive: true,
    headers: {
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  }).catch(() => {
    // Nothing to do: without the message the player goes offline after 75 seconds.
  });
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
