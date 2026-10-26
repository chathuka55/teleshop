import type { NextAuthConfig } from "next-auth";
import { parseTokenClaims, toSessionUser } from "./claims";
import { SIGN_IN_PATH } from "./route-access";

/** Session lifetime (docs/10 §1: 7-day max age). */
export const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;

/**
 * Edge-safe Auth.js config: no providers, no database. middleware.ts uses it to read the session
 * cookie; src/lib/auth/index.ts extends it with providers and the database re-check.
 *
 * Our claims live under `token.claims` (validated with Zod on every read) and are exposed as
 * `session.user`. A token without valid claims yields a session with no user = signed out.
 */
export const authConfig = {
  pages: { signIn: SIGN_IN_PATH, error: SIGN_IN_PATH },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_S },
  providers: [],
  callbacks: {
    session({ session, token }) {
      const claims = parseTokenClaims(token.claims);
      return Object.assign(session, { user: claims ? toSessionUser(claims) : undefined });
    },
  },
} satisfies NextAuthConfig;
