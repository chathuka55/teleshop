import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Seller documents are encrypted before they reach storage (ADR-006): the only bucket is public,
 * so what it holds must be useless without DOCS_ENCRYPTION_KEY. AES-256-GCM, a fresh 12-byte IV
 * per file, and the storage path as associated data — a ciphertext copied to another path (or
 * another seller) fails to decrypt instead of opening someone else's document.
 *
 * Layout: [version 1 byte][iv 12][tag 16][ciphertext].
 */

const VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function encryptDocument(plain: Uint8Array, key: Buffer, path: string): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(path, "utf8"));
  const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), ct]);
}

/** Throws when the key, the path or a single byte doesn't match. */
export function decryptDocument(sealed: Uint8Array, key: Buffer, path: string): Buffer {
  const buf = Buffer.from(sealed);
  if (buf.length < 1 + IV_BYTES + TAG_BYTES || buf[0] !== VERSION) throw new Error("Unknown document format");
  const iv = buf.subarray(1, 1 + IV_BYTES);
  const tag = buf.subarray(1 + IV_BYTES, 1 + IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(path, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(buf.subarray(1 + IV_BYTES + TAG_BYTES)), decipher.final()]);
}
