/**
 * Public Upstash Blob bucket `teleshop-images` (ADR-005). Not a secret: every public object URL
 * contains this host. Used by the CSP `img-src` and `next/image` remotePatterns — only this bucket,
 * never `*.blob.upstash.io`, so the image optimiser can't be used to proxy other people's buckets.
 * Production gets its own bucket: change the host here when it is created (doc 12 §2).
 */
export const BLOB_PUBLIC_HOST = "b65e2efccddc.blob.upstash.io";
