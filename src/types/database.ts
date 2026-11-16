/**
 * Types of the database, written by hand to match supabase/migrations/.
 * Update this file whenever a migration changes a table or a function.
 *
 * Rows use snake_case like the database. Query functions map them to the
 * camelCase shapes in models.ts, so components never see these types.
 * Games and news are not in the database: they are files in the repository.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions --
   supabase-js needs type aliases here: interfaces have no index signature
   and do not match its generic table types. */

type ProfileRow = {
  id: string;
  username: string;
  /** Path in the avatars bucket, e.g. '<user id>/avatar'. Set once, then fixed. */
  avatar_url: string | null;
  created_at: string;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  accepted_at: string | null;
};

type PlaytimeRow = {
  user_id: string;
  /** Folder name of the game in games/. */
  game_slug: string;
  total_seconds: number;
  last_played_at: string;
};

type PartyRow = {
  id: string;
  host_id: string;
  /** Folder name of the running game, or null. */
  game_slug: string | null;
  /** New for every game start; the game uses it as its room code. */
  session_id: string | null;
  created_at: string;
};

type PartyMemberRow = {
  party_id: string;
  user_id: string;
  joined_at: string;
};

type PartyInviteRow = {
  id: string;
  party_id: string;
  inviter_id: string;
  invitee_id: string;
  created_at: string;
};

type UserStatusRow = {
  user_id: string;
  game_slug: string | null;
  last_seen_at: string;
  /** false after "I am away" (0009_active_status_and_party_cleanup.sql). */
  active: boolean;
};

type GameStatsRow = {
  game_slug: string;
  total_seconds: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      friendships: {
        Row: FriendshipRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'friendships_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_addressee_id_fkey';
            columns: ['addressee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      playtime: {
        Row: PlaytimeRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'playtime_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      game_stats: {
        Row: GameStatsRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_status: {
        Row: UserStatusRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      parties: {
        Row: PartyRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'parties_host_id_fkey';
            columns: ['host_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      party_members: {
        Row: PartyMemberRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'party_members_party_id_fkey';
            columns: ['party_id'];
            isOneToOne: false;
            referencedRelation: 'parties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'party_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      party_invites: {
        Row: PartyInviteRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'party_invites_party_id_fkey';
            columns: ['party_id'];
            isOneToOne: false;
            referencedRelation: 'parties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'party_invites_inviter_id_fkey';
            columns: ['inviter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'party_invites_invitee_id_fkey';
            columns: ['invitee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_friend_of: { Args: { other_user: string }; Returns: boolean };
      send_friend_request: { Args: { target_user: string }; Returns: FriendshipRow };
      accept_friend_request: { Args: { request_id: string }; Returns: FriendshipRow };
      my_party_id: { Args: Record<never, never>; Returns: string | null };
      create_party: { Args: Record<never, never>; Returns: string };
      leave_party: { Args: Record<never, never>; Returns: undefined };
      invite_to_party: { Args: { target_user: string }; Returns: undefined };
      accept_party_invite: { Args: { invite_id: string }; Returns: string };
      start_party_game: { Args: { p_game_slug: string }; Returns: string };
      stop_party_game: { Args: Record<never, never>; Returns: undefined };
      report_status: { Args: { p_game_slug: string | null }; Returns: undefined };
      report_away: { Args: Record<never, never>; Returns: undefined };
      friend_statuses: {
        Args: Record<never, never>;
        Returns: {
          user_id: string;
          game_slug: string | null;
          last_seen_at: string;
          is_online: boolean;
        }[];
      };
      kick_party_member: { Args: { target_user: string }; Returns: undefined };
      transfer_party_host: { Args: { target_user: string }; Returns: undefined };
      set_avatar: { Args: Record<never, never>; Returns: string };
      record_playtime: { Args: { p_game_slug: string; p_seconds: number }; Returns: number };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Row'];
