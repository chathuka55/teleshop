"use server";

import { revalidatePath } from "next/cache";
import { signOut, unstable_update } from "@/lib/auth";
import { InvalidImageError } from "@/lib/images/avatar";
import { StorageNotConfiguredError } from "@/lib/storage/blob";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import { changePasswordSchema, profileSchema } from "./schema";
import {
  changeMyPassword,
  removeMyAvatar,
  signOutEverywhere,
  updateMyAvatar,
  updateMyProfile,
} from "./service";

/* Account Server Actions — parse (Zod) → rate limit → service (which checks the session). */

const fd = (formData: FormData): Record<string, FormDataEntryValue | null> =>
  Object.fromEntries(formData.entries());

async function limited(scope: string): Promise<FormState | null> {
  const ip = (await clientIp()) ?? "unknown";
  const r = await rateLimit(`${scope}:${ip}`, { limit: 10, windowMs: 60_000 });
  return r.ok
    ? null
    : { status: "error", message: `Too many attempts. Try again in ${r.retryAfterSeconds} seconds.` };
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse(fd(formData));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const blocked = await limited("account:profile");
  if (blocked) return blocked;
  await updateMyProfile(parsed.data, await clientIp());
  revalidatePath("/account", "layout");
  return { status: "ok", message: "Profile saved." };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse(fd(formData));
  if (!parsed.success) return invalid(parsed.error);
  const blocked = await limited("account:password");
  if (blocked) return blocked;
  const result = await changeMyPassword(parsed.data, await clientIp());
  if (!result.ok)
    return { status: "error", message: result.message, fields: { [result.field]: result.message } };
  // Every session (this one too) is now revoked — sign in again with the new password.
  await signOut({ redirectTo: "/sign-in?changed=1" });
  return { status: "ok", message: "Password changed." };
}

export async function signOutEverywhereAction(): Promise<void> {
  await signOutEverywhere(await clientIp());
  await signOut({ redirectTo: "/sign-in" });
}

/** Re-reads the user into the session so the navbar shows the change right away. */
async function refreshSession(): Promise<void> {
  await unstable_update({});
}

/** Profile photo form: `intent=remove` removes it, otherwise the `avatar` file replaces it. */
export async function avatarAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const blocked = await limited("account:avatar");
  if (blocked) return blocked;

  if (formData.get("intent") === "remove") {
    await removeMyAvatar(await clientIp());
    await refreshSession();
    revalidatePath("/", "layout");
    return { status: "ok", message: "Profile photo removed." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0)
    return { status: "error", message: "Choose a photo to upload." };
  try {
    await updateMyAvatar(new Uint8Array(await file.arrayBuffer()), await clientIp());
  } catch (e) {
    if (e instanceof InvalidImageError) return { status: "error", message: e.message };
    if (e instanceof StorageNotConfiguredError) {
      return {
        status: "error",
        message: "Photo uploads aren't available right now. Please try again later.",
      };
    }
    throw e;
  }
  await refreshSession();
  revalidatePath("/", "layout");
  return { status: "ok", message: "Profile photo updated." };
}
