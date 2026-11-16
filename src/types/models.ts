/**
 * App-level data shapes. Components only ever see these types, no matter
 * whether the data comes from mocks or from the database.
 */

export type GameStatus = 'draft' | 'published';

export interface Game {
  /** Same as the slug: the folder name identifies a game everywhere. */
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  /** Long description in Markdown. */
  description: string;
  genres: string[];
  /** Engine label shown as a badge, e.g. "HTML5", "Unity", "Godot". */
  engine: string;
  coverUrl: string;
  bannerUrl: string;
  screenshots: string[];
  /** Folder name inside games/. */
  gamePath: string;
  version: string;
  status: GameStatus;
  /** ISO date string. */
  publishedAt: string;
  /** Playtime of all players combined, used for the "Most played" sorting. */
  totalPlaytimeSeconds: number;
  /** 1 = can be played alone. More = needs a party of at least this size. */
  minPlayers: number;
  /** 1 = single player only. More = can be played together in a party. */
  maxPlayers: number;
  /** True when the number of players must be even (games played in pairs). */
  evenPlayers: boolean;
}

export interface Profile {
  id: string;
  username: string;
  avatarUrl: string | null;
  /** ISO date string. */
  createdAt: string;
}

export interface PlaytimeEntry {
  gameId: string;
  totalSeconds: number;
  /** ISO date string. */
  lastPlayedAt: string;
}

export type NewsType = 'game_update' | 'launcher_update' | 'announcement';

export interface NewsPost {
  id: string;
  title: string;
  /** Post content in Markdown. */
  bodyMd: string;
  type: NewsType;
  /** Id (folder name) of the game this post is about, if any. */
  gameId: string | null;
  version: string | null;
  /** ISO date string. */
  publishedAt: string;
  authorName: string;
}

export interface Friend {
  profile: Profile;
  /** ISO date string of when the request was accepted. */
  since: string;
}

export interface FriendRequest {
  id: string;
  profile: Profile;
  /** "incoming": they asked us. "outgoing": we asked them. */
  direction: 'incoming' | 'outgoing';
  /** ISO date string. */
  createdAt: string;
}

/** A user's playtime, as visible to themselves and confirmed friends. */
export interface UserPlaytime {
  profile: Profile;
  /** null when the viewer is not allowed to see it (not a friend). */
  playtime: PlaytimeEntry[] | null;
}

/** What a friend is doing right now. */
export type PresenceState = 'online' | 'playing' | 'offline';

export interface FriendStatus {
  userId: string;
  state: PresenceState;
  /** The game they are playing, while state is 'playing'. */
  gameSlug: string | null;
  /**
   * ISO date string of the last time their launcher was open. Null for
   * friends who have not opened the launcher since online status exists.
   */
  lastSeenAt: string | null;
}

export interface PartyMember {
  profile: Profile;
  /** ISO date string. */
  joinedAt: string;
}

/** The party the signed-in user is in. */
export interface Party {
  id: string;
  hostId: string;
  /** Oldest member first. */
  members: PartyMember[];
  /** Friends who were invited but have not answered yet. */
  invited: { inviteId: string; profile: Profile }[];
  /** The game the party is playing right now, or null. */
  gameSlug: string | null;
  /** Changes with every game start; games use it as their room code. */
  sessionId: string | null;
}

/** A message in the party chat. */
export interface PartyMessage {
  id: number;
  /** The writer's profile; null if their account no longer exists. */
  author: Profile | null;
  body: string;
  /** ISO date string. */
  createdAt: string;
}

/** An invitation the signed-in user received. */
export interface PartyInvite {
  id: string;
  partyId: string;
  from: Profile;
  /** ISO date string. */
  createdAt: string;
}

export interface FriendGamePlaytime {
  profile: Profile;
  totalSeconds: number;
}
