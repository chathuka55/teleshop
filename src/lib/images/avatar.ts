import "server-only";
import sharp from "sharp";

/**
 * Profile photo processing (docs/10 §1 uploads): type checked by the file's own bytes (never the
 * browser's claim), size and pixel limits, then re-encoded — which also drops EXIF/GPS data.
 */

/** Below Vercel's 4.5 MB request limit (the Server Action body limit is set to match). */
export const AVATAR_MAX_BYTES = 4 * 1024 * 1024;
export const AVATAR_SIZE = 320;
const ALLOWED = new Set(["jpeg", "png", "webp"]);
/** Refuse decompression bombs: a tiny file that decodes into a huge image. */
const MAX_INPUT_PIXELS = 40_000_000;

export class InvalidImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidImageError";
  }
}

export async function processAvatar(
  input: Uint8Array,
): Promise<{ bytes: Buffer; contentType: "image/webp" }> {
  if (input.byteLength === 0) throw new InvalidImageError("Choose a photo to upload.");
  if (input.byteLength > AVATAR_MAX_BYTES) throw new InvalidImageError("The photo is larger than 4 MB.");

  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata()).format;
  } catch {
    throw new InvalidImageError("That file isn't a photo we can read.");
  }
  if (!format || !ALLOWED.has(format)) throw new InvalidImageError("Use a JPG, PNG or WebP photo.");

  const bytes = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate() // apply the camera's orientation before EXIF is dropped
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "attention" })
    .webp({ quality: 82 })
    .toBuffer();
  return { bytes, contentType: "image/webp" };
}
