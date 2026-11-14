import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { queryKeys } from '@/lib/query-keys';

import {
  acceptPartyInvite,
  createParty,
  deletePartyInvite,
  describePartyError,
  fetchMyParty,
  fetchPartyInvites,
  inviteToParty,
  kickPartyMember,
  leaveParty,
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
