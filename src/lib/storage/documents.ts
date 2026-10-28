import "server-only";
import { env } from "@/config/env";
import { decryptDocument, encryptDocument } from "@/lib/security/doc-crypto";
import { deleteObject, putObject, randomObjectPath, readObject } from "./blob";

/**
 * Private seller documents in the public bucket (ADR-006): encrypted on the way in, decrypted on
 * the way out, never given a public URL. Everything else about them (owner, type) lives in MongoDB.
 */

export class DocumentsNotConfiguredError extends Error {
  constructor() {
    super("Document uploads are not configured (DOCS_ENCRYPTION_KEY is missing).");
    this.name = "DocumentsNotConfiguredError";
  }
}

const FOLDER = "kyc";

function key(): Buffer {
  if (!env.DOCS_ENCRYPTION_KEY) throw new DocumentsNotConfiguredError();
  return Buffer.from(env.DOCS_ENCRYPTION_KEY, "base64");
}

export type DocumentStore = {
  put(ownerId: string, bytes: Uint8Array): Promise<string>;
  read(path: string): Promise<Buffer>;
  remove(path: string): Promise<void>;
};

/** Upstash Blob, encrypted. Services take a DocumentStore so tests can pass an in-memory one. */
export const encryptedDocumentStore: DocumentStore = {
  async put(ownerId, bytes) {
    const k = key();
    // `.bin`: what's stored is ciphertext, whatever the original type was.
    const path = randomObjectPath(FOLDER, ownerId, "bin");
    await putObject(path, encryptDocument(bytes, k, path), "application/octet-stream");
    return path;
  },
  async read(path) {
    return decryptDocument(await readObject(path), key(), path);
  },
  async remove(path) {
    if (path.startsWith(`${FOLDER}/`)) await deleteObject(path);
  },
};
