import "server-only";
import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { env } from "@/config/env";
import { signInSchema } from "@/modules/auth/schema";
import { refreshClaims, signInWithGoogle, signInWithPassword } from "@/modules/auth/service";
import { redeemTwoFactorProof } from "@/modules/auth/two-factor";
import { clientIp } from "@/lib/security/client-ip";
import { authConfig } from "./auth.config";
import { parseTokenClaims, type TokenClaims } from "./claims";

/** Claims handed from a provider/sign-in callback to the jwt callback on the same `user` object. */
type UserWithClaims = User & { claims?: TokenClaims };

const credentials = Credentials({
  credentials: { email: {}, password: {} },
  async authorize(raw): Promise<UserWithClaims | null> {
    const parsed = signInSchema.safeParse(raw);
    if (!parsed.success) return null;
    const result = await signInWithPassword(parsed.data, { ip: await clientIp() });
    if (!result.ok) return null;
    const { claims } = result;
    return { id: claims.id, name: claims.name, email: claims.email, image: claims.image, claims };
  },
});

// Google sign-in switches on when both keys are set (docs/12 §2).
const providers: Provider[] = [credentials];
if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET }));
}

/**
 * Full Auth.js setup (Node runtime). `auth()` here re-checks the user against the database every
 * 5 minutes (tokenVersion, status, role, seller approval) — the edge middleware can't.
 */
export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      const claims = await signInWithGoogle(
        {
          providerAccountId: account.providerAccountId,
          email: String(profile?.email ?? "").toLowerCase(),
          emailVerified: profile?.email_verified === true,
          name: String(profile?.name ?? profile?.email ?? "Teleshop user"),
          image: typeof profile?.picture === "string" ? profile.picture : null,
        },
        { ip: await clientIp() },
      );
      if (!claims) return false;
      (user as UserWithClaims).claims = claims;
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Sign-in: claims come from authorize() or the Google signIn callback above.
      const fresh = parseTokenClaims((user as UserWithClaims | undefined)?.claims);
      if (fresh) return { ...token, claims: fresh };

      const claims = parseTokenClaims(token.claims);
      if (!claims) return null;

      // Session update: the ONLY thing honoured is a one-time 2FA proof issued by the server
      // (modules/auth/two-factor.ts). Anything else a browser posts to /api/auth/session is ignored.
      if (trigger === "update" && claims.role === "admin") {
        const proof = (session as { totpProof?: unknown } | undefined)?.totpProof;
        if (await redeemTwoFactorProof(claims.id, proof)) {
          return { ...token, claims: { ...claims, twoFactorVerified: true, checkedAt: Date.now() } };
        }
      }
      const refreshed = await refreshClaims(claims);
      // null clears the session cookie: revoked, suspended or deleted users are signed out.
      return refreshed ? { ...token, claims: refreshed } : null;
    },
  },
});
