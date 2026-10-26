/** Sign-in policy (docs/10 §1). Pure functions so the rules are unit tested on their own. */

/** Failed password attempts before the account locks. */
export const MAX_FAILED_LOGINS = 5;
/** How long a lock lasts. */
export const LOCK_MS = 15 * 60 * 1000;

export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now.getTime();
}

/** Suspended accounts never sign in, whatever the password. */
export function canSignIn(user: { status: "active" | "suspended" }): boolean {
  return user.status === "active";
}

/** After a failed attempt: lock when the count reaches the limit. */
export function lockAfterFailure(failedCount: number, now: Date): Date | null {
  return failedCount >= MAX_FAILED_LOGINS ? new Date(now.getTime() + LOCK_MS) : null;
}
