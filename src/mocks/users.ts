import type { Profile } from '@/types/models';

function profile(id: string, username: string, createdAt: string, isAdmin = false): Profile {
  return { id, username, avatarUrl: null, isAdmin, createdAt };
}

/** The signed-in user while there are no real accounts yet. */
export const mockCurrentUser = profile('user-me', 'pixel_pilot', '2026-06-01T09:00:00Z', true);

export const mockUsers: Profile[] = [
  profile('user-luna', 'luna_plays', '2026-06-03T09:00:00Z'),
  profile('user-rex', 'rex_on_keys', '2026-06-10T09:00:00Z'),
  profile('user-mika', 'mika', '2026-07-22T09:00:00Z'),
  profile('user-nova', 'nova_42', '2026-08-02T09:00:00Z'),
  profile('user-tom', 'tom_the_bold', '2026-08-19T09:00:00Z'),
  profile('user-ivy', 'ivy_speedrun', '2026-09-05T09:00:00Z'),
  profile('user-kai', 'kai', '2026-10-11T09:00:00Z'),
];
