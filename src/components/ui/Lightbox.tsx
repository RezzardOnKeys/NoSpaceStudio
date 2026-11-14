import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';

interface LightboxImage {
  src: string;
  alt: string;
}

interface LightboxProps {
  images: LightboxImage[];
  /** Index of the image to show, or null when closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const controlClass =
  'inline-flex size-11 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/85';

/** Full-screen image viewer. Arrow keys switch images, Escape closes. */
export function Lightbox({ images, index, onIndexChange, onClose }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = index !== null;
  const image = index === null ? undefined : images[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  function step(offset: number) {
    if (index === null) return;
    onIndexChange((index + offset + images.length) % images.length);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
  }

  function handleBackdropClick(event: MouseEvent<HTMLElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Screenshot viewer"
      onClose={onClose}
      onKeyDown={handleKeyDown}
      className="m-0 size-full max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/85 backdrop:backdrop-blur-sm open:animate-fade-in"
    >
      <div
        className="flex size-full items-center justify-center p-4 sm:p-12"
        onClick={handleBackdropClick}
      >
        {image && (
          <img
            src={image.src}
            alt={image.alt}
            className="max-h-full max-w-full rounded-xl object-contain shadow-overlay"
          />
        )}
      </div>

      <button
        type="button"
        aria-label="Close viewer"
        onClick={onClose}
        className={`${controlClass} absolute top-4 right-4`}
      >
        <X className="size-5" aria-hidden="true" />
      </button>

      {images.length > 1 && index !== null && (
        <>
          <button
            type="button"
            aria-label="Previous screenshot"
            onClick={() => step(-1)}
            className={`${controlClass} absolute top-1/2 left-4 -translate-y-1/2`}
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next screenshot"
            onClick={() => step(1)}
            className={`${controlClass} absolute top-1/2 right-4 -translate-y-1/2`}
          >
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
          <p
            aria-live="polite"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
          >
            {index + 1} / {images.length}
          </p>
        </>
      )}
    </dialog>
  );
}
