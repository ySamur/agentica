export const avatarSize = 256;
export const maxAvatarFile = 10 * 1024 * 1024;
export const avatarTypes = ['image/jpeg', 'image/png', 'image/webp'];

// Crops the middle square, scales it to 256 px and re-encodes it: small, and without the original's
// metadata (EXIF, location). WebP where the browser can encode it, PNG otherwise.
export async function avatarImage(file: Blob) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = avatarSize;
    canvas.height = avatarSize;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, avatarSize, avatarSize);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.88));
    if (!blob) throw new Error('The image could not be encoded');
    return blob;
  } finally {
    bitmap.close();
  }
}
