import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 select-none ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-strong text-on-accent hover:bg-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] hover:shadow-glow',
  secondary:
    'border border-line-strong bg-surface-raised text-fg hover:bg-surface-overlay hover:border-fg-subtle',
  ghost: 'text-fg-muted hover:bg-surface-overlay hover:text-fg',
  danger: 'bg-danger-strong text-white hover:bg-danger',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Class names for anything that should look like a button. Use it directly
 * for router links: <Link className={buttonStyles({ variant: 'primary' })} />.
 */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className);
}
