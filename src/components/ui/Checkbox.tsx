import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** The text next to the box. May contain links. */
  label: ReactNode;
}

/** A checkbox with its label next to it; clicking the text ticks the box. */
export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded accent-accent-strong"
        {...props}
      />
      <label htmlFor={inputId} className="cursor-pointer text-sm text-fg-muted">
        {label}
      </label>
    </div>
  );
}
