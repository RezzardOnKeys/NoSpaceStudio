import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useToast } from '@/components/ui/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { queryKeys } from '@/lib/query-keys';
import { getSupabaseOrNull } from '@/lib/supabase';

import {
  acceptPartyInvite,
  createParty,
  deletePartyInvite,
  describePartyError,
  fetchMyParty,
  fetchPartyInvites,
  fetchPartyMessages,
  inviteToParty,
  kickPartyMember,
  leaveParty,
  sendPartyMessage,
  startPartyGame,
  stopPartyGame,
  transferPartyHost,
} from './api';

/**
 * Realtime (PartyWatcher) refreshes these right away; asking again every
 * 20 seconds is the safety net in case that connection drops.
 */
const REFRESH_MS = 20_000;

/** The signed-in user's party. `data` is null when they are in none. */
export function useParty() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.party,
    queryFn: fetchMyParty,
    enabled: userId !== null,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

export function usePartyInvites() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.partyInvites,
    queryFn: () => fetchPartyInvites(userId ?? ''),
    enabled: userId !== null,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

/** Wraps a party action: refreshes the party afterwards and reports errors. */
function usePartyAction<TInput, TResult>(
  action: (input: TInput) => Promise<TResult>,
  success?: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      if (success) toast({ title: success, variant: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'That did not work',
        description: describePartyError(error),
        variant: 'error',
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['party'] }),
  });
}

export function useCreateParty() {
  return usePartyAction(createParty, 'Party started');
}

export function useInviteToParty() {
  return usePartyAction(inviteToParty, 'Invitation sent');
}

export function useAcceptPartyInvite() {
  return usePartyAction(acceptPartyInvite, 'You joined the party');
}

export function useDeclinePartyInvite() {
  return usePartyAction(deletePartyInvite);
}

export function useCancelPartyInvite() {
  return usePartyAction(deletePartyInvite, 'Invitation taken back');
}

export function useLeaveParty() {
  return usePartyAction(leaveParty, 'You left the party');
}

export function useKickPartyMember() {
  return usePartyAction(kickPartyMember, 'Player removed from the party');
}

export function useTransferPartyHost() {
  return usePartyAction(transferPartyHost, 'New host chosen');
}

/** Host only. Resolves with the new session id; the caller opens the game. */
export function useStartPartyGame() {
  return usePartyAction(startPartyGame);
}

export function useStopPartyGame() {
  return usePartyAction(stopPartyGame);
}

/**
 * The party chat. Realtime reloads it as soon as somebody writes; asking
 * again every 20 seconds is the safety net, like for the party itself.
 */
export function usePartyMessages(partyId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = getSupabaseOrNull();
    if (!supabase) return;

    const refresh = () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.partyMessages(partyId) });
    const channel = supabase
      .channel(`party-messages-${partyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'party_messages',
          filter: `party_id=eq.${partyId}`,
        },
        refresh,
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [partyId, queryClient]);

  return useQuery({
    queryKey: queryKeys.partyMessages(partyId),
    queryFn: () => fetchPartyMessages(partyId),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });
}

/** Sends a chat message; the caller clears its text field on success. */
export function useSendPartyMessage(partyId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: sendPartyMessage,
    onError: (error) => {
      toast({
        title: 'Message not sent',
        description: describePartyError(error),
        variant: 'error',
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.partyMessages(partyId) }),
  });
}
