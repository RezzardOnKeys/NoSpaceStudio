import { X } from 'lucide-react';
import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { IconButton } from './IconButton';

type ModalSize = 'sm' | 'md' | 'lg';

const sizes: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: ModalSize;
  children?: ReactNode;
  /** Action row at the bottom, usually buttons. */
  footer?: ReactNode;
}

/**
 * Dialog built on the native <dialog> element, which gives us focus
 * trapping, Escape to close and inert background for free.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // A click that lands on the <dialog> itself (not its content) hit the backdrop.
  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={handleBackdropClick}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-2xl border border-line-strong bg-surface-raised p-0 text-fg shadow-overlay',
        'backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-pop-in',
        sizes[size],
      )}
    >
      <div className="flex max-h-[85dvh] flex-col">
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-2">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-sm text-fg-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close dialog" onClick={onClose} className="-mt-1 -mr-2">
            <X className="size-5" aria-hidden="true" />
          </IconButton>
        </header>
        {children && <div className="overflow-y-auto px-6 py-3">{children}</div>}
        {footer && (
          <footer className="flex flex-wrap justify-end gap-3 px-6 pt-3 pb-5">{footer}</footer>
        )}
      </div>
    </dialog>
  );
}
