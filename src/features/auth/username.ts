export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 8;

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

/** Usernames are case-insensitive: they are always stored in lower case. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Returns what is wrong with a (normalized) username, or null when it is fine. */
export function validateUsername(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Use at least ${USERNAME_MIN_LENGTH} characters.`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Use at most ${USERNAME_MAX_LENGTH} characters.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Only letters a-z, numbers and underscores are allowed.';
  }
  return null;
}
