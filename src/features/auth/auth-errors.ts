import { isAuthError } from '@supabase/supabase-js';

import { SupabaseNotConfiguredError } from '@/lib/supabase';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  email_not_confirmed:
    'Please confirm your email address first. The link is in the email we sent you.',
  user_already_exists: 'An account with this email already exists. Sign in instead.',
  email_exists: 'An account with this email already exists. Sign in instead.',
  weak_password: 'This password is too weak. Use a longer one.',
  same_password: 'The new password must be different from the old one.',
  over_email_send_rate_limit:
    'Too many emails were sent in a short time. Wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Wait a moment and try again.',
  email_address_invalid: 'This email address is not accepted. Check it for typos.',
  validation_failed: 'Please check the email address and the password.',
  signup_disabled: 'Signing up is switched off at the moment.',
  // The sign-up trigger rejected the profile: the name is taken or invalid.
  unexpected_failure: 'This username is no longer available. Pick another one.',
};

/** Turns an error from a sign-in or sign-up action into a sentence for the user. */
export function describeAuthError(error: unknown): string {
  if (error instanceof SupabaseNotConfiguredError) return error.message;
  if (isAuthError(error)) {
    const known = error.code ? MESSAGES[error.code] : undefined;
    if (known) return known;
    if (error.status === 0 || error.name === 'AuthRetryableFetchError') {
      return 'The server could not be reached. Check your internet connection and try again.';
    }
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
