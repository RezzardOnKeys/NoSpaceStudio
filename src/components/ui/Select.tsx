import { ChevronDown } from 'lucide-react';
import { useId, type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly SelectOption[];
}

/** Compact native select with an inline label, e.g. "Sort by: Newest". */
export function Select({ label, options, className, id, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <label
        htmlFor={selectId}
        className="pointer-events-none absolute left-3 text-sm text-fg-subtle"
      >
        {label}
      </label>
      <select
        id={selectId}
        className="h-9 cursor-pointer appearance-none rounded-lg border border-line-strong bg-surface pr-9 pl-[4.25rem] text-sm font-medium text-fg transition-[border-color,box-shadow] duration-150 hover:border-fg-subtle focus:border-accent focus:ring-4 focus:ring-accent-soft focus:outline-none"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 size-4 text-fg-subtle"
        aria-hidden="true"
      />
    </div>
  );
}
