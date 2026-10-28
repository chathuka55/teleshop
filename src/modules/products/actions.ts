"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { objectId } from "@/lib/validation/common";
import { fieldPathErrors } from "./form-errors";
import { productInputSchema, productStatusSchema, stockChangeSchema } from "./schema";
import {
  addProductImage,
  changeProductStatus,
  changeStock,
  makeCoverImage,
  removeProductImage,
  saveProduct,
} from "./seller";
import type { ProductActionResult, SaveProductResult } from "./types";

/* Seller catalogue Server Actions (P6-T03): parse (Zod) → rate limit 30/min (doc 09) → service. */

async function limit(scope: string): Promise<{ ip: string | null; blocked: string | null }> {
  const ip = await clientIp();
  const r = await rateLimit(`${scope}:${ip ?? "unknown"}`, { limit: 30, windowMs: 60_000 });
  return { ip, blocked: r.ok ? null : `Too many changes. Try again in ${r.retryAfterSeconds} seconds.` };
}

function revalidateProduct(id: string): void {
  revalidatePath("/seller/products");
  revalidatePath(`/seller/products/${id}`);
  revalidatePath("/seller/inventory");
}

/** Create or edit (`id` set). Takes the whole form as an object (variants are a list). */
export async function saveProductAction(input: unknown): Promise<SaveProductResult> {
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fields: fieldPathErrors(parsed.error),
    };
  }
  const { ip, blocked } = await limit("product");
  if (blocked) return { ok: false, message: blocked };
  const r = await saveProduct(parsed.data, ip);
  if (r.ok) revalidateProduct(r.id);
  return r;
}

export async function productStatusAction(input: unknown): Promise<ProductActionResult> {
  const parsed = productStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Reload the page and try again." };
  const { ip, blocked } = await limit("product");
  if (blocked) return { ok: false, message: blocked };
  const r = await changeProductStatus(parsed.data, ip);
  if (r.ok) revalidateProduct(parsed.data.id);
  return r;
}

const imageRef = z.object({ id: objectId, url: z.string().url().max(500) });

export async function uploadProductImageAction(formData: FormData): Promise<ProductActionResult> {
  const id = objectId.safeParse(formData.get("id"));
  const file = formData.get("image");
  if (!id.success || !(file instanceof File)) return { ok: false, message: "Choose a photo to upload." };
  const { ip, blocked } = await limit("product-image");
  if (blocked) return { ok: false, message: blocked };
  const r = await addProductImage(id.data, file, ip);
  if (r.ok) revalidateProduct(id.data);
  return r;
}

export async function productImageAction(input: unknown): Promise<ProductActionResult> {
  const parsed = imageRef.extend({ action: z.enum(["remove", "cover"]) }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Reload the page and try again." };
  const { blocked } = await limit("product-image");
  if (blocked) return { ok: false, message: blocked };
  const { id, url, action } = parsed.data;
  const r = action === "remove" ? await removeProductImage(id, url) : await makeCoverImage(id, url);
  if (r.ok) revalidateProduct(id);
  return r;
}

export async function stockChangeAction(input: unknown): Promise<ProductActionResult> {
  const parsed = stockChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the number." };
  const { ip, blocked } = await limit("stock");
  if (blocked) return { ok: false, message: blocked };
  const r = await changeStock(parsed.data, ip);
  if (r.ok) {
    revalidatePath("/seller/inventory");
    revalidatePath("/seller/products");
  }
  return r;
}
