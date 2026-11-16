import { useSyncExternalStore } from 'react';

/*
 * Invitations the player put aside with "Later" on the floating card
 * (PartyAlerts). They stay valid: on the regular pages they move into the
 * box above the content (PartyNotices), so they are never shown twice.
 * Kept in memory only; after a reload every open invitation floats again.
 */

let later = new Set<string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Puts an invitation aside (the floating card disappears). */
export function putInviteAside(inviteId: string) {
  later = new Set(later).add(inviteId);
  for (const listener of listeners) listener();
}

/** The ids of the invitations put aside. */
export function useInvitesPutAside(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => later);
}
