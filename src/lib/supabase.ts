import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/config/env';
import type { Database } from '@/types/database';

/** Thrown by every data function while the Supabase values are missing. */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not connected yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the .env file and restart the dev server. The guide is in docs/SUPABASE-SETUP.md.',
    );
    this.name = 'SupabaseNotConfiguredError';
  }
}

const client: SupabaseClient<Database> | null = env.isSupabaseConfigured
  ? createClient<Database>(env.supabaseUrl, env.supabaseAnonKey)
  : null;

/** The Supabase client, or null while the project is not configured. */
export function getSupabaseOrNull(): SupabaseClient<Database> | null {
  return client;
}

/** The Supabase client. Throws a helpful error while it is not configured. */
export function getSupabase(): SupabaseClient<Database> {
  if (!client) throw new SupabaseNotConfiguredError();
  return client;
}
