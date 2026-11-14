import { AtSign, Check, LoaderCircle, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { Input } from '@/components/ui/Input';

import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from './username';

export type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'unknown';

const TRAILING: Partial<Record<UsernameStatus, ReactNode>> = {
  checking: <LoaderCircle className="animate-spin text-fg-subtle" aria-hidden="true" />,
  available: <Check className="text-success" aria-hidden="true" />,
  taken: <X className="text-danger" aria-hidden="true" />,
};

interface UsernameFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  status: UsernameStatus;
  /** Validation message, shown instead of the hint. */
  error?: string;
}

/** Username input that shows live whether the name is still free. */
export function UsernameField({ value, onChange, onBlur, status, error }: UsernameFieldProps) {
  const hint =
    status === 'available'
      ? 'This username is available.'
      : status === 'checking'
        ? 'Checking availability…'
        : `${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters: a-z, 0-9 and underscores.`;

  return (
    <div aria-live="polite">
      <Input
        label="Username"
        name="username"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={USERNAME_MAX_LENGTH}
        required
        icon={<AtSign />}
        trailing={TRAILING[status]}
        hint={hint}
        error={error}
      />
    </div>
  );
}
