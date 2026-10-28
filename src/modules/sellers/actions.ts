"use server";

import { revalidatePath } from "next/cache";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import { shopSettingsSchema } from "./schema";
import { setMyShopCover, updateMyShopSettings } from "./seller";

/* Shop settings Server Actions (P6-T05): parse (Zod) → rate limit 5/min (doc 09) → service. */

async function limited(): Promise<{ ip: string | null; blocked: FormState | null }> {
  const ip = await clientIp();
  const r = await rateLimit(`shop:${ip ?? "unknown"}`, { limit: 5, windowMs: 60_000 });
  return {
    ip,
    blocked: r.ok
      ? null
      : { status: "error", message: `Too many changes. Try again in ${r.retryAfterSeconds} seconds.` },
  };
}

export async function updateShopAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = shopSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const { ip, blocked } = await limited();
  if (blocked) return { ...blocked, values: echoValues(formData) } as FormState;
  const r = await updateMyShopSettings(parsed.data, ip);
  if (!r.ok) return { status: "error", message: r.message, values: echoValues(formData) };
  revalidatePath("/seller/settings");
  revalidatePath("/seller/payouts");
  revalidatePath("/s/[shop]", "page");
  return { status: "ok", message: r.message };
}

/** Upload (`cover` file) or remove (`intent=remove`) the shop's cover photo. */
export async function shopCoverAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const remove = formData.get("intent") === "remove";
  const file = formData.get("cover");
  if (!remove && !(file instanceof File && file.size > 0))
    return { status: "error", message: "Choose a photo." };
  const { ip, blocked } = await limited();
  if (blocked) return blocked;
  const r = await setMyShopCover(remove ? null : (file as File), ip);
  if (!r.ok) return { status: "error", message: r.message };
  revalidatePath("/seller/settings");
  revalidatePath("/s/[shop]", "page");
  return { status: "ok", message: r.message };
}
