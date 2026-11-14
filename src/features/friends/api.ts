import { toProfile } from '@/features/profile/api';
import { getSupabase } from '@/lib/supabase';
import type { Friend, FriendRequest, Profile } from '@/types/models';

/** Everything friend related of the signed-in user, loaded in one request. */
export interface Friendships {
  /** Confirmed friends, sorted by name. */
  friends: Friend[];
  /** Open requests, newest first. */
  requests: FriendRequest[];
}

/*
 * One friendship row has two profiles: the one who asked (requester) and
 * the one who was asked (addressee). The names after "!" pick which of the
 * two links to the profiles table is meant.
 */
const FRIENDSHIP_SELECT =
  'id, status, created_at, accepted_at, requester_id, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)';

export async function fetchFriendships(myId: string): Promise<Friendships> {
  // Row Level Security only returns rows the signed-in user is part of.
  const { data, error } = await getSupabase()
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const friends: Friend[] = [];
  const requests: FriendRequest[] = [];

  for (const row of data) {
    const iAsked = row.requester_id === myId;
    const other = iAsked ? row.addressee : row.requester;
    if (!other) continue;
    const profile = toProfile(other);

    if (row.status === 'accepted') {
      friends.push({ profile, since: row.accepted_at ?? row.created_at });
    } else {
      requests.push({
        id: row.id,
        profile,
        direction: iAsked ? 'outgoing' : 'incoming',
        createdAt: row.created_at,
      });
    }
  }

  friends.sort((a, b) => a.profile.username.localeCompare(b.profile.username));
  return { friends, requests };
}

const SEARCH_LIMIT = 10;

/** In a LIKE pattern "_" means "any character"; escape it to mean "_". */
function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Players whose name starts with the query. Leaves out the signed-in user,
 * their friends and everyone with an open request in either direction.
 */
export async function searchUsers(query: string, myId: string): Promise<Profile[]> {
  // Usernames only contain a-z, 0-9 and "_", so nothing else can match.
  if (!/^[a-z0-9_]+$/.test(query)) return [];

  const supabase = getSupabase();
  const [profiles, friendships] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .like('username', `${escapeLikePattern(query)}%`)
      .neq('id', myId)
      .order('username')
      .limit(SEARCH_LIMIT),
    supabase.from('friendships').select('requester_id, addressee_id'),
  ]);
  if (profiles.error) throw profiles.error;
  if (friendships.error) throw friendships.error;

  const taken = new Set(friendships.data.flatMap((row) => [row.requester_id, row.addressee_id]));
  return profiles.data.filter((row) => !taken.has(row.id)).map(toProfile);
}

/**
 * Sends a request. If the other player already asked us, the database
 * accepts their request instead (see send_friend_request in the migrations).
 */
export async function sendFriendRequest(userId: string): Promise<void> {
  const { error } = await getSupabase().rpc('send_friend_request', { target_user: userId });
  if (error) throw error;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { error } = await getSupabase().rpc('accept_friend_request', { request_id: requestId });
  if (error) throw error;
}

/** Declines an incoming request or cancels an outgoing one. */
export async function deleteFriendRequest(requestId: string): Promise<void> {
  const { error } = await getSupabase().from('friendships').delete().eq('id', requestId);
  if (error) throw error;
}

/**
 * Ends a friendship. Row Level Security limits the delete to rows the
 * signed-in user is part of, and each pair exists only once, so this hits
 * exactly the friendship with that player.
 */
export async function removeFriend(userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('friendships')
    .delete()
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
}

const FRIEND_ERROR_MESSAGES: Record<string, string> = {
  user_not_found: 'This player does not exist anymore.',
  request_not_found: 'This request is no longer open. It may have been cancelled.',
  cannot_befriend_yourself: 'You cannot add yourself as a friend.',
};

/** A sentence for the user about a failed friend action. */
export function describeFriendError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return FRIEND_ERROR_MESSAGES[message] ?? 'Check your internet connection and try again.';
}
