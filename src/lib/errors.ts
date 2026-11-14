import { SupabaseNotConfiguredError } from './supabase';

/**
 * A mistake in a content file (games/<slug>/game.json or news/<post>.md).
 * The message names the file and says what to fix.
 */
export class ContentError extends Error {
  constructor(file: string, problem: string) {
    super(`${file}: ${problem}`);
    this.name = 'ContentError';
  }
}

/**
 * A hint for error states that says how to fix the problem. Returns undefined
 * for ordinary failures, so the caller's default text is used.
 */
export function describeLoadError(error: unknown): string | undefined {
  return error instanceof SupabaseNotConfiguredError || error instanceof ContentError
    ? error.message
    : undefined;
}
