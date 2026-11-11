/**
 * A Server Component error reaches `onRequestError` twice: once as itself (from the RSC render,
 * with the digest the error page shows) and once more from server-side rendering as Next's
 * generic stand-in — "An error occurred in the Server Components render…" — with another digest.
 * The stand-in carries nothing new, so only the original is reported (P8-T05).
 */
const RSC_STAND_IN = "An error occurred in the Server Components render";

export function isRenderStandIn(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(RSC_STAND_IN);
}
