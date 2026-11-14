import { toProfile } from '@/features/profile/api';
import { getSupabase } from '@/lib/supabase';
import type { Party, PartyInvite } from '@/types/models';

/*
 * Parties live in Supabase (supabase/migrations/0006_parties.sql). All
 * changes go through database functions; reading is limited by Row Level
 * Security to the user's own party and invitations.
 */

const PARTY_SELECT =
  'id, host_id, game_slug, session_id, members:party_members(joined_at, profile:profiles(*)), invites:party_invites(id, invitee:profiles!party_invites_invitee_id_fkey(*))';

/** The signed-in user's party, or null when they are in none. */
export async function fetchMyParty(): Promise<Party | null> {
  const supabase = getSupabase();
  const { data: partyId, error: idError } = await supabase.rpc('my_party_id');
  if (idError) throw idError;
  if (!partyId) return null;

  const { data, error } = await supabase
    .from('parties')
    .select(PARTY_SELECT)
    .eq('id', partyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    hostId: data.host_id,
    members: data.members
      .flatMap((member) =>
        member.profile ? [{ profile: toProfile(member.profile), joinedAt: member.joined_at }] : [],
      )
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
    invited: data.invites.flatMap((invite) =>
      invite.invitee ? [{ inviteId: invite.id, profile: toProfile(invite.invitee) }] : [],
    ),
    gameSlug: data.game_slug,
    sessionId: data.session_id,
  };
}

/** Invitations the signed-in user received, newest first. */
export async function fetchPartyInvites(myId: string): Promise<PartyInvite[]> {
  const { data, error } = await getSupabase()
    .from('party_invites')
    .select('id, party_id, created_at, inviter:profiles!party_invites_inviter_id_fkey(*)')
    .eq('invitee_id', myId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return data.flatMap((row) =>
    row.inviter
      ? [
          {
            id: row.id,
            partyId: row.party_id,
            from: toProfile(row.inviter),
            createdAt: row.created_at,
          },
        ]
      : [],
  );
}

export async function createParty(): Promise<void> {
  const { error } = await getSupabase().rpc('create_party');
  if (error) throw error;
}

/** Invites a friend. Creates a party first when the user has none. */
export async function inviteToParty(userId: string): Promise<void> {
  const { error } = await getSupabase().rpc('invite_to_party', { target_user: userId });
  if (error) throw error;
}

export async function acceptPartyInvite(inviteId: string): Promise<void> {
  const { error } = await getSupabase().rpc('accept_party_invite', { invite_id: inviteId });
  if (error) throw error;
}

/** Declines a received invitation or takes back one the party sent. */
export async function deletePartyInvite(inviteId: string): Promise<void> {
  const { error } = await getSupabase().from('party_invites').delete().eq('id', inviteId);
  if (error) throw error;
}

export async function leaveParty(): Promise<void> {
  const { error } = await getSupabase().rpc('leave_party');
  if (error) throw error;
}

/** Host only. Returns the new session id. */
export async function startPartyGame(gameSlug: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('start_party_game', { p_game_slug: gameSlug });
  if (error) throw error;
  return data;
}

export async function stopPartyGame(): Promise<void> {
  const { error } = await getSupabase().rpc('stop_party_game');
  if (error) throw error;
}

const PARTY_ERROR_MESSAGES: Record<string, string> = {
  not_friends: 'You can only invite confirmed friends.',
  already_in_party: 'This player is already in your party.',
  party_full: 'The party is full (8 players).',
  invite_not_found: 'This invitation is no longer valid. The party may have ended.',
  no_party: 'You are not in a party.',
  not_host: 'Only the party host can start a game.',
};

export function describePartyError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  return PARTY_ERROR_MESSAGES[message] ?? 'Check your internet connection and try again.';
}
