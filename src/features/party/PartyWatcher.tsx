import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import { useToast } from '@/components/ui/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { getSupabaseOrNull } from '@/lib/supabase';

import { partyPlayPath } from './party-session';
import { useParty } from './queries';

/**
 * Runs once for the whole app (see RootLayout) and does two things:
 * 1. Listens to Supabase Realtime, so new invitations, members and game
 *    starts show up immediately instead of on the next refresh.
 * 2. Pulls party members into the game when the host starts one.
 */
export function PartyWatcher() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: party } = useParty();

  useEffect(() => {
    const supabase = getSupabaseOrNull();
    if (!supabase || !userId) return;

    // Any change to party data: ask again. The rules in the database make
    // sure only rows this user may read are delivered.
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ['party'] });
    const channel = supabase
      .channel(`party-updates-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'party_invites' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'party_members' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties' }, refresh)
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [userId, queryClient]);

  // The session the launcher has already seen. undefined = nothing seen yet,
  // so a game that was running before the page loaded does not pull anyone.
  const seenSession = useRef<string | null | undefined>(undefined);
  const sessionId = party?.sessionId ?? null;
  const gameSlug = party?.gameSlug ?? null;
  const isHost = party?.hostId === userId;

  useEffect(() => {
    if (party === undefined) return;
    const previous = seenSession.current;
    seenSession.current = sessionId;
    if (previous === undefined || !sessionId || !gameSlug || sessionId === previous) return;
    // The host opens the game himself; everybody else follows.
    if (isHost) return;
    toast({ title: 'Your party is starting a game', variant: 'info' });
    void navigate(partyPlayPath(gameSlug, sessionId));
  }, [party, sessionId, gameSlug, isHost, navigate, toast]);

  return null;
}
