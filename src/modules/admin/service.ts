import "server-only";
import {
  approveSeller,
  countProductsByStatus,
  countSellersByStatus,
  findProductForAdmin,
  findSellerForAdmin,
  listProductsByStatus,
  listSellersByStatus,
  rejectSeller,
  setProductModeration,
} from "@/db/repositories/admin-catalog.repository";
import { adminOrderCounts } from "@/db/repositories/admin-order.repository";
import { findSellerContacts } from "@/db/repositories/seller.repository";
import { withTransaction } from "@/db/mongoose";
import { assertRole } from "@/lib/auth/authorize";
import type { SessionUser } from "@/lib/auth/claims";
import { audit } from "@/modules/audit/service";
import type { ProductStatus } from "@/modules/products/types";
import { colomboMonthStart } from "@/modules/sellers/access";
import type { AdminActionResult } from "@/modules/orders/admin-types";
import { sendProductDecisionEmail, sendShopApprovedEmail, sendShopRejectedEmail } from "./emails";
import type {
  AdminDashboardDTO,
  AdminProductDTO,
  AdminProductRowDTO,
  AdminSellerDTO,
  AdminSellerRowDTO,
} from "./types";

/**
 * Admin console: dashboard (A2), shop approvals (A10), product moderation (A5/A6). Every function
 * starts with assertRole("admin") (TOTP passed); every write is audit-logged.
 */

const fail = (message: string, fields?: Record<string, string>): AdminActionResult => ({
  ok: false,
  message,
  ...(fields ? { fields } : {}),
});

/** Midnight today in Sri Lanka, as a UTC instant. */
function colomboDayStart(now: Date): Date {
  const offset = 5.5 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offset);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset);
}

export async function getAdminDashboardFor(
  user: SessionUser | null,
  now = new Date(),
): Promise<AdminDashboardDTO> {
  assertRole(user, ["admin"]);
  const [counts, pendingSellers, productsInReview] = await Promise.all([
    adminOrderCounts(colomboDayStart(now), colomboMonthStart(now)),
    countSellersByStatus("pending"),
    countProductsByStatus("pending_review"),
  ]);
  return { ...counts, pendingSellers, productsInReview };
}

// ---- Shops (A10) ----

export async function listSellersFor(
  user: SessionUser | null,
  status: AdminSellerRowDTO["status"],
): Promise<AdminSellerRowDTO[]> {
  assertRole(user, ["admin"]);
  return listSellersByStatus(status);
}

export async function getSellerFor(user: SessionUser | null, id: string): Promise<AdminSellerDTO | null> {
  assertRole(user, ["admin"]);
  return findSellerForAdmin(id);
}

/** Approve (owner becomes a seller) or reject with a reason the applicant sees. */
export async function decideSellerFor(
  user: SessionUser | null,
  input: { id: string; decision: "approve" | "reject"; reason: string },
  ctx: { ip: string | null; now?: Date },
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  const seller = await findSellerForAdmin(input.id);
  if (!seller) return fail("We couldn't find that shop.");
  if (input.decision === "reject" && !input.reason) {
    return fail("Give a reason — the applicant sees it.", { reason: "Give a reason" });
  }
  if (input.decision === "approve" && !seller.hasDocument) {
    return fail("This shop hasn't uploaded its business registration yet — ask for it before approving.");
  }

  const ok =
    input.decision === "approve"
      ? await withTransaction((session) => approveSeller(input.id, admin.id, ctx.now ?? new Date(), session))
      : await rejectSeller(input.id, input.reason);
  if (!ok) return fail("This application was already decided. Reload the page.");

  await audit.log({
    actorId: admin.id,
    actorRole: "admin",
    action: input.decision === "approve" ? "seller.approved" : "seller.rejected",
    entity: "seller",
    entityId: input.id,
    data: input.decision === "reject" ? { reason: input.reason } : {},
    ip: ctx.ip,
  });
  await (
    input.decision === "approve"
      ? sendShopApprovedEmail(seller.ownerEmail, seller.ownerName, seller.shopName)
      : sendShopRejectedEmail(seller.ownerEmail, seller.ownerName, seller.shopName, input.reason)
  ).catch(() => undefined);
  return {
    ok: true,
    message:
      input.decision === "approve"
        ? `${seller.shopName} is approved. The owner was emailed and can sell now.`
        : `${seller.shopName} was rejected. The owner was emailed the reason.`,
  };
}

// ---- Products (A5/A6) ----

export async function listProductsFor(
  user: SessionUser | null,
  status: ProductStatus,
): Promise<AdminProductRowDTO[]> {
  assertRole(user, ["admin"]);
  return listProductsByStatus(status);
}

export async function getProductFor(user: SessionUser | null, id: string): Promise<AdminProductDTO | null> {
  assertRole(user, ["admin"]);
  return findProductForAdmin(id);
}

const moderation = {
  approve: { from: ["pending_review"], to: "published", email: "approved" },
  // Back to the seller's drafts; they fix it and send it for review again.
  return: { from: ["pending_review"], to: "draft", email: "returned" },
  block: { from: ["draft", "pending_review", "published", "inactive"], to: "blocked", email: "blocked" },
} as const satisfies Record<
  string,
  { from: readonly ProductStatus[]; to: ProductStatus; email: "approved" | "returned" | "blocked" }
>;

export async function moderateProductFor(
  user: SessionUser | null,
  input: { id: string; decision: keyof typeof moderation; note: string },
  ctx: { ip: string | null; now?: Date },
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  if (input.decision !== "approve" && !input.note) {
    return fail("Add a note — the seller sees it.", { note: "Add a note for the seller" });
  }
  const product = await findProductForAdmin(input.id);
  if (!product) return fail("We couldn't find that product.");
  const rule = moderation[input.decision];
  const sellerId = await setProductModeration(
    input.id,
    rule.from,
    rule.to,
    input.decision === "approve" ? null : input.note,
    ctx.now ?? new Date(),
  );
  if (!sellerId) return fail("This product changed meanwhile. Reload the page.");

  await audit.log({
    actorId: admin.id,
    actorRole: "admin",
    action: `product.${input.decision === "approve" ? "approved" : input.decision === "return" ? "returned" : "blocked"}`,
    entity: "product",
    entityId: input.id,
    data: input.note ? { note: input.note } : {},
    ip: ctx.ip,
  });
  const [shop] = await findSellerContacts([sellerId]).catch(() => []);
  if (shop) {
    await sendProductDecisionEmail(
      shop.ownerEmail,
      shop.shopName,
      { id: input.id, name: product.name },
      rule.email,
      input.note,
    ).catch(() => undefined);
  }
  return {
    ok: true,
    message: {
      approve: "Approved — it's on sale now.",
      return: "Sent back to the seller's drafts with your note.",
      block: "Blocked. The seller was told why.",
    }[input.decision],
  };
}
