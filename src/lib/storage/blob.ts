import "server-only";
import { randomBytes } from "node:crypto";
import { Bucket } from "@upstash/blob";
import { env } from "@/config/env";
import { BLOB_PUBLIC_HOST } from "@/config/storage";

/**
 * All file storage goes through here (ADR-005: Upstash Blob, public bucket `teleshop-images`).
 * Keeping the SDK behind this module means a move to R2/S3 touches one file.
 */

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File uploads are not configured (UPSTASH_BLOB_TOKEN is missing).");
    this.name = "StorageNotConfiguredError";
  }
}

let bucket: Bucket | null = null;

function getBucket(): Bucket {
  if (!env.UPSTASH_BLOB_TOKEN) throw new StorageNotConfiguredError();
  bucket ??= new Bucket({ token: env.UPSTASH_BLOB_TOKEN });
  return bucket;
}

/** `<folder>/<prefix>-<16 random hex>.<ext>` — unguessable, never derived from the file name. */
export function randomObjectPath(folder: string, prefix: string, ext: string): string {
  return `${folder}/${prefix}-${randomBytes(8).toString("hex")}.${ext}`;
}

/** Stores public image bytes (already validated + re-encoded) and returns their public URL. */
export async function putPublicImage(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const blob = await getBucket().put(path, bytes, { contentType, cache: "immutable", allowOverwrite: false });
  const url = blob.url ?? (await getBucket().publicUrl(path));
  // The URL must be on our bucket's host: the CSP and next/image only allow that host.
  if (!url || new URL(url).hostname !== BLOB_PUBLIC_HOST) {
    throw new Error("Upload stored, but not on the configured public bucket host");
  }
  return url;
}

/** Path of an object in our bucket, or null for any other URL (seed images, Google photos…). */
export function ownObjectPath(url: string | null | undefined, folder: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const path = decodeURIComponent(u.pathname.replace(/^\//, ""));
    return u.hostname === BLOB_PUBLIC_HOST && path.startsWith(`${folder}/`) ? path : null;
  } catch {
    return null;
  }
}

/** Best effort: a leftover file costs a little storage, a failed delete must not fail the request. */
export async function deleteObject(path: string): Promise<void> {
  try {
    await getBucket().del(path);
  } catch {
    // ignore
  }
}
