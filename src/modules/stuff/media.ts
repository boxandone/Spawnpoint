import { fitWithin } from './logic';

const MAX_SIDE = 2000;
const THUMB_SIDE = 320;
const ACCEPTED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

export const ACCEPT_ATTR = 'image/*,application/pdf';

function draw(bitmap: ImageBitmap, max: number, quality: number): Promise<Blob | null> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Images are shrunk to 2000px JPEG on the device (with a 320px thumbnail).
 * PDFs, GIFs, and images the browser can't decode are uploaded as they are.
 */
export async function prepareFile(
  file: File,
): Promise<{ blob: Blob; mime: string; thumb: Blob | null } | null> {
  const mime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
  if (!ACCEPTED.has(mime)) return null;
  if (mime === 'application/pdf') return { blob: file, mime, thumb: null };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { blob: file, mime, thumb: null };
  }
  try {
    const thumb = await draw(bitmap, THUMB_SIDE, 0.7);
    if (mime === 'image/gif') return { blob: file, mime, thumb };
    const full = await draw(bitmap, MAX_SIDE, 0.82);
    if (full && (full.size < file.size || mime !== 'image/jpeg')) {
      return { blob: full, mime: 'image/jpeg', thumb };
    }
    return { blob: file, mime, thumb };
  } finally {
    bitmap.close();
  }
}
