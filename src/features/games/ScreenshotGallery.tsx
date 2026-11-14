import { Expand } from 'lucide-react';
import { useState } from 'react';

import { Lightbox } from '@/components/ui/Lightbox';

interface ScreenshotGalleryProps {
  gameTitle: string;
  screenshots: string[];
}

export function ScreenshotGallery({ gameTitle, screenshots }: ScreenshotGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const images = screenshots.map((src, index) => ({
    src,
    alt: `${gameTitle} screenshot ${index + 1} of ${screenshots.length}`,
  }));

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image, index) => (
          <li key={image.src}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Open screenshot ${index + 1}`}
              className="group border-line hover:border-line-strong relative block aspect-video w-full overflow-hidden rounded-xl border transition-colors"
            >
              <img
                src={image.src}
                alt=""
                loading="lazy"
                className="ease-out-soft size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Expand className="size-6 text-white" aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Lightbox
        images={images}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
      />
    </>
  );
}
