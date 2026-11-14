const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/** The values from .env.example do not count as a real configuration. */
function isPlaceholder(value: string): boolean {
  return value === '' || value.includes('your-project-ref') || value.includes('your-public-anon');
}

/** Typed access to environment variables, with safe defaults for local work. */
export const env = {
  /** Origin that serves the games/ folder, without a trailing slash. */
  gamesBaseUrl: (import.meta.env.VITE_GAMES_BASE_URL ?? 'http://localhost:5174').replace(
    /\/+$/,
    '',
  ),
  supabaseUrl,
  /** The public anon key. Safe to ship to the browser; RLS protects the data. */
  supabaseAnonKey,
  /** False until both Supabase values are filled in (see docs/SUPABASE-SETUP.md). */
  isSupabaseConfigured: !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey),
} as const;
