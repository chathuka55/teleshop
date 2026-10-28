import "server-only";
import sharp from "sharp";
import { MAX_INPUT_PIXELS, assertPhoto } from "./avatar";

/** Longest side of a stored product photo — sharp on retina product pages, small enough to load fast. */
export const PRODUCT_IMAGE_MAX = 1600;

/**
 * Product photo (P6-T03): same checks as profile photos (type by content, 4 MB, pixel bomb limit),
 * then re-encoded to WebP — EXIF/GPS dropped, never upscaled, aspect ratio kept.
 */
export async function processProductImage(
  input: Uint8Array,
): Promise<{ bytes: Buffer; contentType: "image/webp"; width: number; height: number }> {
  await assertPhoto(input);
  const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize(PRODUCT_IMAGE_MAX, PRODUCT_IMAGE_MAX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer({ resolveWithObject: true });
  return { bytes: data, contentType: "image/webp", width: info.width, height: info.height };
}
