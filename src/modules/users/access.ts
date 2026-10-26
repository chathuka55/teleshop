import type { SessionUser } from "@/lib/auth/claims";

/**
 * Who may change an account (RULES.md: every module has access.ts). Account pages only ever act
 * on the signed-in user's own record — the id always comes from the session, never from a form.
 */
export function accountIdFor(user: SessionUser): string {
  return user.id;
}

/** Google-only accounts have no password to change. */
export function canChangePassword(hasPassword: boolean): boolean {
  return hasPassword;
}
