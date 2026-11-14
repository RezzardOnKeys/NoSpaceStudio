/** Cache keys for all queries, in one place so invalidation never mistypes one. */
export const queryKeys = {
  /** `null` is the guest: nobody is signed in. */
  currentUser: (userId: string | null) => ['current-user', userId],
  usernameTaken: (username: string) => ['username-taken', username],
  games: ['games'],
  news: ['news'],
  myPlaytime: ['playtime', 'me'],
  userPlaytime: (username: string) => ['playtime', 'user', username],
  friendsPlaytimeForGame: (gameId: string) => ['playtime', 'friends', gameId],
  /** Friends and open requests of the signed-in user. */
  friendships: ['friendships'],
  userSearch: (query: string) => ['user-search', query],
  /** The signed-in user's party and the invitations they received. */
  party: ['party', 'mine'],
  partyInvites: ['party', 'invites'],
  /** Online status of the signed-in user's friends. */
  friendStatuses: ['friend-statuses'],
} as const;
