import { CircleAlert } from 'lucide-react';
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Keep the label for screen readers but hide it visually (e.g. search). */
  hideLabel?: boolean;
  /** Helper text below the field. */
  hint?: string;
  /** Error message. Replaces the hint and marks the field as invalid. */
  error?: string;
  /** Icon inside the field, on the left. */
  icon?: ReactNode;
  /** Element inside the field, on the right (e.g. a status indicator). */
  trailing?: ReactNode;
}

export function Input({
  label,
  hideLabel = false,
  hint,
  error,
  icon,
  trailing,
  className,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const hasMessage = Boolean(error ?? hint);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={inputId}
        className={cn('text-sm font-medium text-fg', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle [&>svg]:size-4"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          className={cn(
            'h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle',
            'transition-[border-color,box-shadow] duration-150',
            'hover:border-fg-subtle focus:border-accent focus:ring-4 focus:ring-accent-soft focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'aria-invalid:border-danger aria-invalid:focus:ring-danger-soft',
            icon && 'pl-9',
            trailing && 'pr-10',
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-3 flex items-center [&>svg]:size-4">
            {trailing}
          </span>
        )}
      </div>
      {error ? (
        <p id={messageId} className="flex items-center gap-1.5 text-sm text-danger">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="text-sm text-fg-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
