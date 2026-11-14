import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type NoticeVariant = 'info' | 'success' | 'warning' | 'danger';

const variants: Record<NoticeVariant, { box: string; iconColor: string; icon: LucideIcon }> = {
  info: { box: 'border-info/40 bg-info-soft', iconColor: 'text-info', icon: Info },
  success: {
    box: 'border-success/40 bg-success-soft',
    iconColor: 'text-success',
    icon: CircleCheck,
  },
  warning: {
    box: 'border-warning/40 bg-warning-soft',
    iconColor: 'text-warning',
    icon: TriangleAlert,
  },
  danger: { box: 'border-danger/40 bg-danger-soft', iconColor: 'text-danger', icon: CircleAlert },
};

interface NoticeProps {
  variant?: NoticeVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Inline message inside a page or form, e.g. a form error or a setup hint. */
export function Notice({ variant = 'info', title, children, className }: NoticeProps) {
  const { box, iconColor, icon: Icon } = variants[variant];

  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border p-3 text-sm', box, className)}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', iconColor)} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        <div className="text-fg-muted">{children}</div>
      </div>
    </div>
  );
}
