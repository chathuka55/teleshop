import type { TokenClaims } from "@/lib/auth/claims";

/** Request context for audit + rate limits. `ip` is hashed before it is stored. */
export type AuthContext = { ip: string | null; now?: Date };

/**
 * Password sign-in result. Failure has no reason on purpose: wrong email, wrong password,
 * locked and suspended all look the same to the caller (no account enumeration).
 */
export type PasswordSignInResult = { ok: true; claims: TokenClaims } | { ok: false };

/** Profile fields we read from Google (only when Google says the email is verified). */
export type GoogleProfile = {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image: string | null;
};
