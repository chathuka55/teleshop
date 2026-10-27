"use server";

import { revalidatePath } from "next/cache";
import { objectId } from "@/lib/validation/common";
import { echoValues, invalid, type FormState } from "@/lib/validation/form";
import { addressSchema } from "./schema";
import { deleteMyAddress, saveMyAddress } from "./service";

/* Address Server Actions — parse (Zod) → service (session owner, max 10 per user). */

export async function saveAddressAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = addressSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return invalid(parsed.error, echoValues(formData));
  const rawId = formData.get("id");
  const id = typeof rawId === "string" && rawId !== "" ? objectId.safeParse(rawId) : null;
  if (id && !id.success) return { status: "error", message: "That address no longer exists." };

  const r = await saveMyAddress(parsed.data, id?.data);
  if (!r.ok) return { status: "error", message: r.message, values: echoValues(formData) };
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { status: "ok", message: "Address saved." };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const id = objectId.safeParse(formData.get("id"));
  if (!id.success) return;
  await deleteMyAddress(id.data);
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}
