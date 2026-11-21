import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { IconButton } from './IconButton';
import {
  ToastContext,
  type ToastContextValue,
  type ToastOptions,
  type ToastVariant,
} from './toast-context';

const DEFAULT_DURATION_MS = 5000;
const MAX_VISIBLE_TOASTS = 4;

/*
 * A running number is enough to tell toasts apart. crypto.randomUUID() would
 * also work, but browsers offer it only on https and localhost, so the
 * launcher would break when it is opened from a phone in the home network
 * (http://192.168.…).
 */
let nextToastId = 0;

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'variant' | 'duration'>> {
  id: string;
  description?: string;
}

const variantStyles: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'text-info' },
  success: { icon: CircleCheck, className: 'text-success' },
  warning: { icon: TriangleAlert, className: 'text-warning' },
  error: { icon: CircleAlert, className: 'text-danger' },
};

interface ToastCardProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastCard({ item, onDismiss }: ToastCardProps) {
  const reduceMotion = useReducedMotion();
  const { icon: Icon, className } = variantStyles[item.variant];

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [item.id, item.duration, onDismiss]);

  return (
    <motion.li
      layout={!reduceMotion}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      // Errors interrupt screen readers; everything else waits its turn.
      role={item.variant === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line-strong bg-surface-overlay p-4 shadow-overlay"
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', className)} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold text-fg">{item.title}</p>
        {item.description && <p className="text-sm text-fg-muted">{item.description}</p>}
      </div>
      <IconButton
        label="Dismiss notification"
        onClick={() => onDismiss(item.id)}
        className="-mt-1.5 -mr-1.5 size-8"
      >
        <X className="size-4" aria-hidden="true" />
      </IconButton>
    </motion.li>
  );
}

interface ToastProviderProps {
  children: ReactNode;
}

/** Holds the toast queue and renders it in the bottom-right corner. */
export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = `toast-${++nextToastId}`;
    const item: ToastItem = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant ?? 'info',
      duration: options.duration ?? DEFAULT_DURATION_MS,
    };
    setItems((current) => [...current, item].slice(-MAX_VISIBLE_TOASTS));
    return id;
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ol
        aria-label="Notifications"
        className="pointer-events-none fixed right-0 bottom-0 z-50 flex w-full max-w-sm flex-col gap-2 p-4"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </ol>
    </ToastContext.Provider>
  );
}
