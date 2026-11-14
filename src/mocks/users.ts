import type { Profile } from '@/types/models';

function profile(id: string, username: string, createdAt: string, isAdmin = false): Profile {
  return { id, username, avatarUrl: null, isAdmin, createdAt };
}

/** The signed-in user while there are no real accounts yet. */
export const mockCurrentUser = profile('user-me', 'pixel_pilot', '2026-06-01T09:00:00Z', true);

/**
 * Other players. Empty until real accounts exist; add profiles here by hand
 * to try out the friends pages before that.
 */
export const mockUsers: Profile[] = [];
