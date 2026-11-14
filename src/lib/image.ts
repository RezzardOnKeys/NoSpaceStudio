/** Formats people may pick. The result is always converted to WebP or JPEG. */
export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp';

/** Larger files are refused before decoding, to keep phones from running out of memory. */
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

export class ImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageError';
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Turns a picked file into a small square picture: cut to a square from the
 * centre, scaled to `size` pixels, saved as WebP (or JPEG where the browser
 * cannot write WebP). Everything happens on the device; only the small
 * result is uploaded.
 */
export async function toSquareImage(file: File, size = 512): Promise<Blob> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError('This file is larger than 20 MB. Pick a smaller picture.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageError('This file could not be read as a picture. Use a PNG, JPG or WebP file.');
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new ImageError('Your browser cannot edit pictures.');

  context.imageSmoothingQuality = 'high';
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();

  // Browsers that cannot write WebP silently return PNG instead.
  const webp = await canvasToBlob(canvas, 'image/webp', 0.85);
  if (webp?.type === 'image/webp') return webp;
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.88);
  if (!jpeg) throw new ImageError('The picture could not be prepared. Try another one.');
  return jpeg;
}
