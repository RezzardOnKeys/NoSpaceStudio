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
        Update: { avatar_url?: string | null };
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
    };
    Views: Record<never, never>;
    Functions: {
      is_friend_of: { Args: { other_user: string }; Returns: boolean };
      send_friend_request: { Args: { target_user: string }; Returns: FriendshipRow };
      accept_friend_request: { Args: { request_id: string }; Returns: FriendshipRow };
      record_playtime: { Args: { p_game_slug: string; p_seconds: number }; Returns: number };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Row'];
