import "server-only";
import { randomBytes } from "node:crypto";
import {
  ProductChangedError,
  addProductImage,
  brandExists,
  changeStock,
  deleteFreeStock,
  findSellerProduct,
  findSpecTemplate,
  insertProduct,
  insertStock,
  makeCoverImage,
  removeProductImage,
  setProductStatus,
  skusInUse,
  slugTaken,
  updateSellerProduct,
  type ProductWrite,
} from "@/db/repositories/seller-product.repository";
import { withTransaction } from "@/db/mongoose";
import type { SessionUser } from "@/lib/auth/claims";
import { InvalidImageError } from "@/lib/images/avatar";
import { processProductImage } from "@/lib/images/product";
import { deleteObject, ownObjectPath, putPublicImage, randomObjectPath } from "@/lib/storage/blob";
import { audit } from "@/modules/audit/service";
import {
  MAX_PRODUCT_IMAGES,
  canEditProduct,
  canProductAction,
  cleanSpecs,
  makeSku,
  priceChangeNeedsReview,
  sellerProductActions,
  slugify,
  statusAfterEdit,
  variantAttributeKeys,
} from "./access";
import { variantLabel, type ProductInput, type ProductStatusInput, type StockChangeInput } from "./schema";
import type { ProductActionResult, SaveProductResult } from "./types";

/**
 * Seller catalogue (P6-T03). Every function takes the signed-in seller; the repositories filter
 * by that seller's id, so another shop's product is simply "not found".
 */

const IMAGE_FOLDER = "products";
const NOT_FOUND: SaveProductResult & ProductActionResult = {
  ok: false,
  message: "We couldn't find that product in your shop.",
};

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

const suffix = (): string => randomBytes(2).toString("hex");

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name).slice(0, 100);
  if (base.length >= 2 && !(await slugTaken(base))) return base;
  for (let i = 0; i < 5; i++) {
    const s = `${base || "product"}-${randomBytes(3).toString("hex")}`;
    if (!(await slugTaken(s))) return s;
  }
  throw new Error("Could not find a free product slug");
}

/** Create (no id) or edit the seller's product. Prices and stock come from the form, in cents. */
export async function saveProductFor(
  user: SessionUser,
  input: ProductInput,
  ctx: { ip: string | null },
): Promise<SaveProductResult> {
  const sellerId = user.sellerId;
  if (!sellerId) return NOT_FOUND;

  const [template, brandOk] = await Promise.all([
    findSpecTemplate(input.categoryId),
    brandExists(input.brandId),
  ]);
  const fields: Record<string, string> = {};
  if (!template) fields.categoryId = "Choose a category";
  if (!brandOk) fields.brandId = "Choose a brand";
  const { specs, errors } = cleanSpecs(template ?? [], input.specs);
  for (const [k, msg] of Object.entries(errors)) fields[`specs.${k}`] = msg;

  const existing = input.id ? await findSellerProduct(sellerId, input.id) : null;
  if (input.id && !existing) return NOT_FOUND;
  if (existing && !canEditProduct(existing.status)) {
    return {
      ok: false,
      message: "This product was blocked by Teleshop and can't be edited. Contact support.",
    };
  }

  // Variants: options limited to the template's select fields + colour; blank SKUs generated.
  const allowedKeys = new Set(variantAttributeKeys(template ?? []));
  const oldSkus = new Set(existing?.variants.map((v) => v.sku) ?? []);
  const variants = input.variants.map((v) => {
    const attributes = Object.fromEntries(
      Object.entries(v.attributes).filter(([k, val]) => allowedKeys.has(k) && val !== ""),
    );
    const label = variantLabel({ label: v.label, attributes });
    return {
      sku: v.sku || makeSku(input.shortName, label, suffix()),
      label,
      attributes,
      priceCents: v.price,
      compareAtCents: v.compareAt === "" ? null : v.compareAt,
      isActive: v.isActive,
    };
  });
  const active = variants.filter((v) => v.isActive);
  if (!active.length) fields.variants = "Keep at least one variant on sale";

  const added = variants.filter((v) => !oldSkus.has(v.sku));
  const taken = new Set(
    await skusInUse(
      added.map((v) => v.sku),
      existing?.id,
    ),
  );
  variants.forEach((v, i) => {
    if (taken.has(v.sku)) fields[`variants.${i}.sku`] = "This SKU is already used by another product";
  });
  if (Object.keys(fields).length) return { ok: false, message: "Please fix the highlighted fields.", fields };

  const write: ProductWrite = {
    categoryId: input.categoryId,
    brandId: input.brandId,
    name: input.name,
    shortName: input.shortName,
    condition: input.condition,
    shortDescription: input.shortDescription,
    description: input.description,
    highlights: input.highlights.filter(Boolean),
    specs,
    warranty: { months: input.warrantyMonths, type: input.warrantyType },
    freeDelivery: input.freeDelivery,
    variants,
    basePriceCents: Math.min(...active.map((v) => v.priceCents)),
  };
  // Opening stock is only taken for new variants; later changes go through the stock page.
  const stock = new Map(input.variants.map((v, i) => [variants[i]?.sku ?? "", v.stock]));

  try {
    if (!existing) {
      const slug = await uniqueSlug(input.name);
      const id = await withTransaction((session) => insertProduct(sellerId, slug, write, stock, session));
      await audit.log({
        actorId: user.id,
        actorRole: "seller",
        action: "product.created",
        entity: "product",
        entityId: id,
        ip: ctx.ip,
      });
      return { ok: true, id, status: "draft", message: "Draft saved. Add photos, then send it for review." };
    }

    const removed = existing.variants.filter((v) => !variants.some((n) => n.sku === v.sku));
    const busy = removed.filter((v) => v.stock.reserved > 0);
    if (busy.length) {
      return {
        ok: false,
        message: `“${busy[0]?.label}” has units reserved by open orders. Turn it off instead of removing it.`,
      };
    }
    const review = priceChangeNeedsReview(existing.variants, variants);
    const status = statusAfterEdit(existing.status, review);
    await withTransaction(async (session) => {
      for (const v of removed) {
        if (!(await deleteFreeStock(sellerId, v.sku, session))) throw new ProductChangedError();
      }
      await updateSellerProduct(sellerId, existing.id, existing.updatedAt, write, status, session);
      await insertStock(
        sellerId,
        existing.id,
        added.map((v) => v.sku),
        stock,
        session,
      );
    });
    await audit.log({
      actorId: user.id,
      actorRole: "seller",
      action: "product.updated",
      entity: "product",
      entityId: existing.id,
      data: { status, priceReview: review, added: added.length, removed: removed.length },
      ip: ctx.ip,
    });
    return {
      ok: true,
      id: existing.id,
      status,
      message:
        status === "pending_review" && existing.status !== "pending_review"
          ? "Saved. A price changed by more than 20 %, so Teleshop reviews it before it's back on sale."
          : "Saved.",
    };
  } catch (e) {
    if (e instanceof ProductChangedError) {
      return {
        ok: false,
        message:
          "This product changed while you were editing (an order may have reserved stock). Reload and try again.",
      };
    }
    if (isDuplicateKey(e))
      return { ok: false, message: "A SKU is already used by another product. Change it and try again." };
    throw e;
  }
}

/** Send a draft for review, take a product off sale, or put it back on sale. */
export async function productStatusFor(
  user: SessionUser,
  input: ProductStatusInput,
  ctx: { ip: string | null },
): Promise<ProductActionResult> {
  if (!user.sellerId) return NOT_FOUND;
  const p = await findSellerProduct(user.sellerId, input.id);
  if (!p) return NOT_FOUND;
  if (!canProductAction(input.action, p.status)) {
    return { ok: false, message: `That isn't possible while the product is ${p.status.replace("_", " ")}.` };
  }
  if (input.action === "submit" && !p.images.length) {
    return { ok: false, message: "Add at least one photo before sending the product for review." };
  }
  const to =
    input.action === "submit"
      ? "pending_review"
      : input.action === "deactivate"
        ? "inactive"
        : p.publishedAt
          ? "published"
          : "pending_review";
  const ok = await setProductStatus(user.sellerId, p.id, sellerProductActions[input.action].from, to);
  if (!ok) return { ok: false, message: "This product just changed. Reload the page and try again." };
  await audit.log({
    actorId: user.id,
    actorRole: "seller",
    action: `product.${input.action}`,
    entity: "product",
    entityId: p.id,
    data: { to },
    ip: ctx.ip,
  });
  return {
    ok: true,
    message: {
      submit: "Sent for review. Teleshop checks new products, usually within a day.",
      deactivate: "Taken off sale. Buyers can't see or order it now.",
      reactivate: to === "published" ? "Back on sale." : "Sent for review before it goes on sale.",
    }[input.action],
  };
}

/** Adds one photo: checked by content, re-encoded, stored under a random name. */
export async function addProductImageFor(
  user: SessionUser,
  productId: string,
  file: File,
  ctx: { ip: string | null },
): Promise<ProductActionResult> {
  if (!user.sellerId) return NOT_FOUND;
  const p = await findSellerProduct(user.sellerId, productId);
  if (!p || !canEditProduct(p.status)) return NOT_FOUND;
  if (p.images.length >= MAX_PRODUCT_IMAGES) {
    return { ok: false, message: `Up to ${MAX_PRODUCT_IMAGES} photos per product.` };
  }
  let image: Awaited<ReturnType<typeof processProductImage>>;
  try {
    image = await processProductImage(new Uint8Array(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof InvalidImageError) return { ok: false, message: e.message };
    throw e;
  }
  const path = randomObjectPath(IMAGE_FOLDER, p.id, "webp");
  const url = await putPublicImage(path, image.bytes, image.contentType);
  const added = await addProductImage(
    user.sellerId,
    p.id,
    { url, width: image.width, height: image.height, alt: p.name },
    MAX_PRODUCT_IMAGES,
  );
  if (!added) {
    await deleteObject(path);
    return { ok: false, message: `Up to ${MAX_PRODUCT_IMAGES} photos per product.` };
  }
  await audit.log({
    actorId: user.id,
    actorRole: "seller",
    action: "product.image.add",
    entity: "product",
    entityId: p.id,
    ip: ctx.ip,
  });
  return { ok: true, message: "Photo added." };
}

export async function removeProductImageFor(
  user: SessionUser,
  productId: string,
  url: string,
): Promise<ProductActionResult> {
  if (!user.sellerId) return NOT_FOUND;
  if (!(await removeProductImage(user.sellerId, productId, url))) return NOT_FOUND;
  // Only our own uploads are deleted from storage — seed/demo photos are shared files.
  const path = ownObjectPath(url, IMAGE_FOLDER);
  if (path) await deleteObject(path);
  return { ok: true, message: "Photo removed." };
}

export async function makeCoverImageFor(
  user: SessionUser,
  productId: string,
  url: string,
): Promise<ProductActionResult> {
  if (!user.sellerId) return NOT_FOUND;
  return (await makeCoverImage(user.sellerId, productId, url))
    ? { ok: true, message: "Cover photo changed." }
    : NOT_FOUND;
}

/** Stock steppers (S3). Units reserved by open orders can't be removed. */
export async function changeStockFor(
  user: SessionUser,
  input: StockChangeInput,
  ctx: { ip: string | null },
): Promise<ProductActionResult> {
  if (!user.sellerId) return NOT_FOUND;
  const r = await changeStock(user.sellerId, input.sku, input);
  if (!r.ok) {
    return r.reason === "NOT_FOUND"
      ? { ok: false, message: "We couldn't find that SKU in your shop." }
      : {
          ok: false,
          message: "Some of these units are reserved by open orders, so stock can't go that low.",
        };
  }
  await audit.log({
    actorId: user.id,
    actorRole: "seller",
    action: "inventory.adjust",
    entity: "inventory",
    entityId: input.sku,
    data: { mode: input.mode, qty: input.qty, onHand: r.onHand },
    ip: ctx.ip,
  });
  return { ok: true, message: `${input.sku}: ${r.onHand} on the shelf.` };
}
