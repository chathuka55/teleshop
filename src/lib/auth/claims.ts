import { z } from "zod";

/**
 * What a session carries (docs/phases/phase-2-auth.md). Kept in the Auth.js JWT and copied to
 * `session.user`. Always parsed with Zod — never trusted as-is, even though the JWT is signed.
 * Edge-safe: no database or Node APIs, so middleware can import it.
 */
export const roleSchema = z.enum(["customer", "seller", "admin"]);
export type Role = z.infer<typeof roleSchema>;

export const sessionUserSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  role: roleSchema,
  /** set only for sellers whose shop is approved */
  sellerId: z.string().nullable(),
  emailVerified: z.boolean(),
  /** admins must pass TOTP (P2-T05) before /admin opens */
  twoFactorVerified: z.boolean(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** Claims stored in the JWT: the session user + revocation data. */
export const tokenClaimsSchema = sessionUserSchema.extend({
  /** must match users.tokenVersion — bumping it signs the user out everywhere */
  tokenVersion: z.number().int().min(0),
  /** epoch ms of the last database re-check (every 5 min) */
  checkedAt: z.number().int(),
});
export type TokenClaims = z.infer<typeof tokenClaimsSchema>;

/** How often the JWT is re-validated against the database (docs/10 §1, tokenVersion). */
export const RECHECK_MS = 5 * 60 * 1000;

/** Parses a session/JWT `user` value; null when missing or malformed. */
export function parseSessionUser(value: unknown): SessionUser | null {
  const r = sessionUserSchema.safeParse(value);
  return r.success ? r.data : null;
}

export function parseTokenClaims(value: unknown): TokenClaims | null {
  const r = tokenClaimsSchema.safeParse(value);
  return r.success ? r.data : null;
}

/** Drops the revocation fields (Zod strips keys the session schema doesn't know). */
export function toSessionUser(c: TokenClaims): SessionUser {
  return sessionUserSchema.parse(c);
}
