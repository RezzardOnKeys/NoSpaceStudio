import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import { useUsernameTaken } from './queries';
import { validateUsername } from './username';
import type { UsernameStatus } from './UsernameField';

interface UsernameCheck {
  status: UsernameStatus;
  /** What to tell the user, or undefined when there is nothing to complain about. */
  error: string | undefined;
}

/** Validates a (normalized) username and checks live whether it is still free. */
export function useUsernameCheck(username: string): UsernameCheck {
  const debounced = useDebouncedValue(username, 350);
  const taken = useUsernameTaken(debounced);

  if (username === '') return { status: 'idle', error: undefined };

  const problem = validateUsername(username);
  if (problem) return { status: 'invalid', error: problem };

  if (debounced !== username || taken.isFetching) return { status: 'checking', error: undefined };
  // The check itself failed (offline, not configured). The server decides on submit.
  if (taken.isError) return { status: 'unknown', error: undefined };
  if (taken.data) return { status: 'taken', error: 'This username is already taken.' };
  return { status: 'available', error: undefined };
}
