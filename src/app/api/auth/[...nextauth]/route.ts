import { handlers } from "@/lib/auth";

/** Auth.js endpoints (sign-in callbacks, session, sign-out) — docs/09 `/auth/[...nextauth]`. */
export const { GET, POST } = handlers;
