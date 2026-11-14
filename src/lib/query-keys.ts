/** Cache keys for all queries, in one place so invalidation never mistypes one. */
export const queryKeys = {
  currentUser: ['current-user'],
  games: ['games'],
  news: ['news'],
  myPlaytime: ['playtime', 'me'],
  userPlaytime: (username: string) => ['playtime', 'user', username],
  friendsPlaytimeForGame: (gameId: string) => ['playtime', 'friends', gameId],
  friends: ['friends'],
  friendRequests: ['friend-requests'],
  userSearch: (query: string) => ['user-search', query],
} as const;
