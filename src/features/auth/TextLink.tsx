import { Link, type LinkProps } from 'react-router';

import { cn } from '@/lib/cn';

/** Accent-coloured inline link for the account pages. */
export function TextLink({ className, ...props }: LinkProps) {
  return (
    <Link
      className={cn(
        'rounded font-medium text-accent-bright underline-offset-4 hover:underline',
        className,
      )}
      {...props}
    />
  );
}
