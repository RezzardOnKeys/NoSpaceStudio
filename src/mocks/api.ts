/**
 * In-memory stand-in for the backend. Every function is async and has the
 * shape the real data layer will have, so swapping mocks for Supabase later
 * only touches the query functions, not the components.
 *
 * State lives in module variables and resets on page reload.
 */
import type {
  Friend,
  FriendGamePlaytime,
  FriendRequest,
  Game,
  NewsPost,
  PlaytimeEntry,
  Profile,
  UserPlaytime,
} from '@/types/models';

import { mockGames } from './games';
import { mockNews } from './news';
import { mockCurrentUser, mockUsers } from './users';

const LATENCY_MS = 350;

function respond<T>(value: T): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), LATENCY_MS));
}

function requireUser(userId: string): Profile {
  const user = mockUsers.find((candidate) => candidate.id === userId);
  if (!user) throw new Error('This user does not exist anymore.');
  return user;
}

function entry(gameId: string, totalSeconds: number, lastPlayedAt: string): PlaytimeEntry {
  return { gameId, totalSeconds, lastPlayedAt };
}

const playtimeByUser: Record<string, PlaytimeEntry[]> = {
  'user-me': [
    entry('game-star-dodger', 15_300, '2026-11-13T20:10:00Z'),
    entry('game-neon-drift', 27_900, '2026-11-12T18:30:00Z'),
    entry('game-tile-shift', 5_400, '2026-11-09T12:00:00Z'),
    entry('game-dungeon-of-echoes', 9_800, '2026-10-28T21:00:00Z'),
  ],
  'user-luna': [
    entry('game-neon-drift', 61_200, '2026-11-13T22:00:00Z'),
    entry('game-cloud-kingdom', 22_500, '2026-11-11T17:00:00Z'),
    entry('game-star-dodger', 7_200, '2026-11-01T17:00:00Z'),
  ],
  'user-rex': [
    entry('game-star-dodger', 33_000, '2026-11-14T08:00:00Z'),
    entry('game-tile-shift', 18_600, '2026-11-10T19:00:00Z'),
    entry('game-moonbase-tycoon', 12_000, '2026-10-30T19:00:00Z'),
  ],
  'user-mika': [
    entry('game-dungeon-of-echoes', 44_100, '2026-11-12T23:00:00Z'),
    entry('game-star-dodger', 2_700, '2026-10-20T23:00:00Z'),
  ],
};

let friends: Friend[] = [
  { profile: requireUser('user-luna'), since: '2026-07-01T10:00:00Z' },
  { profile: requireUser('user-rex'), since: '2026-06-12T10:00:00Z' },
  { profile: requireUser('user-mika'), since: '2026-09-15T10:00:00Z' },
];

let requests: FriendRequest[] = [
  {
    id: 'request-1',
    profile: requireUser('user-nova'),
    direction: 'incoming',
    createdAt: '2026-11-13T15:00:00Z',
  },
  {
    id: 'request-2',
    profile: requireUser('user-tom'),
    direction: 'outgoing',
    createdAt: '2026-11-11T15:00:00Z',
  },
];

function isFriend(userId: string): boolean {
  return friends.some((friend) => friend.profile.id === userId);
}

// --- Session -----------------------------------------------------------------

export function fetchCurrentUser(): Promise<Profile> {
  return respond(mockCurrentUser);
}

// --- Games and news ----------------------------------------------------------

export function fetchGames(): Promise<Game[]> {
  return respond(mockGames.filter((game) => game.status === 'published'));
}

export function fetchNews(): Promise<NewsPost[]> {
  return respond([...mockNews].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
}

// --- Playtime ----------------------------------------------------------------

export function fetchMyPlaytime(): Promise<PlaytimeEntry[]> {
  return respond(playtimeByUser[mockCurrentUser.id] ?? []);
}

/** Returns null when no user has this username. */
export function fetchUserPlaytime(username: string): Promise<UserPlaytime | null> {
  const wanted = username.toLowerCase();
  if (wanted === mockCurrentUser.username) {
    return respond({
      profile: mockCurrentUser,
      playtime: playtimeByUser[mockCurrentUser.id] ?? [],
    });
  }
  const profile = mockUsers.find((user) => user.username === wanted);
  if (!profile) return respond(null);
  return respond({
    profile,
    playtime: isFriend(profile.id) ? (playtimeByUser[profile.id] ?? []) : null,
  });
}

export function fetchFriendsPlaytimeForGame(gameId: string): Promise<FriendGamePlaytime[]> {
  const result = friends.flatMap(({ profile }) => {
    const played = playtimeByUser[profile.id]?.find((item) => item.gameId === gameId);
    return played ? [{ profile, totalSeconds: played.totalSeconds }] : [];
  });
  return respond(result.sort((a, b) => b.totalSeconds - a.totalSeconds));
}

// --- Friends -----------------------------------------------------------------

export function fetchFriends(): Promise<Friend[]> {
  return respond([...friends].sort((a, b) => a.profile.username.localeCompare(b.profile.username)));
}

export function fetchFriendRequests(): Promise<FriendRequest[]> {
  return respond([...requests]);
}

/** Finds users whose name starts with the query. Excludes friends and open requests. */
export function searchUsers(query: string): Promise<Profile[]> {
  const wanted = query.trim().toLowerCase();
  if (wanted.length < 2) return respond([]);
  const busy = new Set([
    ...friends.map((friend) => friend.profile.id),
    ...requests.map((request) => request.profile.id),
  ]);
  return respond(
    mockUsers.filter((user) => user.username.startsWith(wanted) && !busy.has(user.id)),
  );
}

export function sendFriendRequest(userId: string): Promise<FriendRequest> {
  const request: FriendRequest = {
    id: crypto.randomUUID(),
    profile: requireUser(userId),
    direction: 'outgoing',
    createdAt: new Date().toISOString(),
  };
  requests = [...requests, request];
  return respond(request);
}

export function acceptFriendRequest(requestId: string): Promise<void> {
  const request = requests.find((item) => item.id === requestId);
  if (!request) throw new Error('This request is no longer open.');
  requests = requests.filter((item) => item.id !== requestId);
  friends = [...friends, { profile: request.profile, since: new Date().toISOString() }];
  return respond(undefined);
}

/** Declines an incoming request or cancels an outgoing one. */
export function deleteFriendRequest(requestId: string): Promise<void> {
  requests = requests.filter((item) => item.id !== requestId);
  return respond(undefined);
}

export function removeFriend(userId: string): Promise<void> {
  friends = friends.filter((friend) => friend.profile.id !== userId);
  return respond(undefined);
}
