import { getSupabase } from '@/lib/supabase';
import { paths } from '@/routes/paths';

function absoluteUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

export interface SignUpInput {
  email: string;
  password: string;
  /** Normalized: lower case, already validated. */
  username: string;
}

export interface SignUpResult {
  /** True when the account exists but the email has to be confirmed first. */
  needsEmailConfirmation: boolean;
}

export async function signUp({ email, password, username }: SignUpInput): Promise<SignUpResult> {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      // The database trigger reads the username from here to create the profile.
      // age_confirmed records that the user confirmed being at least 16.
      data: { username, age_confirmed: true },
      emailRedirectTo: absoluteUrl(paths.store),
    },
  });
  if (error) throw error;
  // For an email that is already registered, Supabase answers with a user
  // without identities instead of an error (so emails cannot be probed).
  if (data.user?.identities?.length === 0) {
    throw new Error('An account with this email already exists. Sign in instead.');
  }
  return { needsEmailConfirmation: data.session === null };
}

export interface SignInInput {
  email: string;
  password: string;
}

export async function signIn({ email, password }: SignInInput): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

/** Sends an email with a link to the reset page. */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: absoluteUrl(paths.resetPassword),
  });
  if (error) throw error;
}

/** Sets a new password for the signed-in user (also used after a reset link). */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw error;
}
