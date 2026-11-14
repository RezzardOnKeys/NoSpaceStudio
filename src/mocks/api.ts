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

/** Playtime per user id. Empty until someone has games to play. */
const playtimeByUser: Record<string, PlaytimeEntry[]> = {};

let friends: Friend[] = [];

let requests: FriendRequest[] = [];

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
