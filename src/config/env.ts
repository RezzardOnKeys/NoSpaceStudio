/** Typed access to environment variables, with safe defaults for local work. */
export const env = {
  /** Origin that serves the games/ folder, without a trailing slash. */
  gamesBaseUrl: (import.meta.env.VITE_GAMES_BASE_URL ?? 'http://localhost:5174').replace(
    /\/+$/,
    '',
  ),
} as const;
