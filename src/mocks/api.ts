/**
 * In-memory stand-in for the parts of the backend that are not connected to
 * Supabase yet: playtime (phase 4) and friends (phase 5). Accounts, games and
 * news already come from the database (see features/<feature>/api.ts).
 *
 * Every function is async and has the shape the real data layer will have,
 * so swapping a mock for Supabase only touches the query functions, not the
 * components. State lives in module variables and resets on page reload.
 */
import type {
  Friend,
  FriendGamePlaytime,
  FriendRequest,
  PlaytimeEntry,
  Profile,
} from '@/types/models';

import { mockUsers } from './users';

const LATENCY_MS = 350;

function respond<T>(value: T): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), LATENCY_MS));
}

function requireUser(userId: string): Profile {
  const user = mockUsers.find((candidate) => candidate.id === userId);
  if (!user) throw new Error('This user does not exist anymore.');
  return user;
}

/** The signed-in user's playtime. Empty until tracking is built. */
const myPlaytime: PlaytimeEntry[] = [];

/** Playtime of other players, by user id. */
const playtimeByUser: Record<string, PlaytimeEntry[]> = {};

let friends: Friend[] = [];

let requests: FriendRequest[] = [];

function isFriend(userId: string): boolean {
  return friends.some((friend) => friend.profile.id === userId);
}

// --- Playtime ----------------------------------------------------------------

export function fetchMyPlaytime(): Promise<PlaytimeEntry[]> {
  return respond(myPlaytime);
}

/** Another player's playtime. Null when they are not a confirmed friend. */
export function fetchPlaytimeOfUser(userId: string): Promise<PlaytimeEntry[] | null> {
  return respond(isFriend(userId) ? (playtimeByUser[userId] ?? []) : null);
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
