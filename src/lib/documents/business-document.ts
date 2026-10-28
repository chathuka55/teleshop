import "server-only";
import sharp from "sharp";
import { InvalidImageError, MAX_INPUT_PIXELS, assertPhoto } from "@/lib/images/avatar";

/** Same as the Server Action body limit (next.config.ts). */
export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;

export type CheckedDocument = {
  bytes: Buffer;
  contentType: "application/pdf" | "image/jpeg";
  ext: "pdf" | "jpg";
};

/**
 * Business-registration upload (P6-T01): a PDF, or a photo of the certificate. Type by the file's
 * own bytes. Photos are re-encoded (drops EXIF/GPS and anything hidden in the file); PDFs can't be,
 * so they are only ever downloaded by admins as an attachment, never shown inline.
 */
export async function checkBusinessDocument(input: Uint8Array): Promise<CheckedDocument> {
  if (input.byteLength === 0) throw new InvalidImageError("Choose your business registration file.");
  if (input.byteLength > DOCUMENT_MAX_BYTES) throw new InvalidImageError("The file is larger than 4 MB.");

  if (Buffer.from(input.subarray(0, 5)).toString("latin1") === "%PDF-") {
    return { bytes: Buffer.from(input), contentType: "application/pdf", ext: "pdf" };
  }
  try {
    await assertPhoto(input);
  } catch {
    throw new InvalidImageError("Use a PDF, or a JPG / PNG photo of the certificate.");
  }
  const bytes = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return { bytes, contentType: "image/jpeg", ext: "jpg" };
}
