"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/guards";
import { limitAction } from "@/lib/security/action-limit";
import { objectId } from "@/lib/validation/common";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import { addressSchema } from "./schema";
import { deleteMyAddress, saveMyAddress } from "./service";

/* Address Server Actions — parse (Zod) → rate limit 10/min → service (session owner, max 10 per user). */

const limited = async (): Promise<boolean> =>
  !(await limitAction("addresses", 10, (await getCurrentUser())?.id)).ok;

export async function saveAddressAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = addressSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const rawId = formData.get("id");
  const id = typeof rawId === "string" && rawId !== "" ? objectId.safeParse(rawId) : null;
  if (id && !id.success) return { status: "error", message: "That address no longer exists." };
  if (await limited()) {
    return {
      status: "error",
      message: "Too many changes in a row. Wait a minute and try again.",
      values: echoValues(formData),
    };
  }

  const r = await saveMyAddress(parsed.data, id?.data);
  if (!r.ok) return { status: "error", message: r.message, values: echoValues(formData) };
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { status: "ok", message: "Address saved." };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const id = objectId.safeParse(formData.get("id"));
  if (!id.success || (await limited())) return;
  await deleteMyAddress(id.data);
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}
