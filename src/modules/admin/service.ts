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
import { countOpenShopPackages, setShopSuspended } from "@/db/repositories/admin-people.repository";
import { findSellerContacts } from "@/db/repositories/seller.repository";
import { withTransaction } from "@/db/mongoose";
import { assertRole } from "@/lib/auth/authorize";
import type { SessionUser } from "@/lib/auth/claims";
import { audit } from "@/modules/audit/service";
import type { ProductStatus } from "@/modules/products/types";
import { colomboMonthStart } from "@/modules/sellers/access";
import type { AdminActionResult } from "@/modules/orders/admin-types";
import {
  sendProductDecisionEmail,
  sendShopApprovedEmail,
  sendShopReinstatedEmail,
  sendShopRejectedEmail,
  sendShopSuspendedEmail,
} from "./emails";
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

export type SellerDecision = "approve" | "reject" | "suspend" | "reinstate";

/**
 * Applications: approve (owner becomes a seller) or reject with a reason the applicant sees.
 * Live shops: suspend with a reason (products hidden from the store, the owner loses the seller
 * dashboard at the next session check) or reinstate.
 */
export async function decideSellerFor(
  user: SessionUser | null,
  input: { id: string; decision: SellerDecision; reason: string },
  ctx: { ip: string | null; now?: Date },
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  const seller = await findSellerForAdmin(input.id);
  if (!seller) return fail("We couldn't find that shop.");
  if ((input.decision === "reject" || input.decision === "suspend") && !input.reason) {
    return fail("Give a reason — the owner sees it.", { reason: "Give a reason" });
  }
  if (input.decision === "approve" && !seller.hasDocument) {
    return fail("This shop hasn't uploaded its business registration yet — ask for it before approving.");
  }

  const ok = await {
    approve: () =>
      withTransaction((session) => approveSeller(input.id, admin.id, ctx.now ?? new Date(), session)),
    reject: () => rejectSeller(input.id, input.reason),
    suspend: () => setShopSuspended(input.id, true, input.reason),
    reinstate: () => setShopSuspended(input.id, false, ""),
  }[input.decision]();
  if (!ok) return fail("This shop changed meanwhile. Reload the page.");

  await audit.log({
    actorId: admin.id,
    actorRole: "admin",
    action: `seller.${{ approve: "approved", reject: "rejected", suspend: "suspended", reinstate: "reinstated" }[input.decision]}`,
    entity: "seller",
    entityId: input.id,
    data: input.reason ? { reason: input.reason } : {},
    ip: ctx.ip,
  });
  const mail = {
    approve: () => sendShopApprovedEmail(seller.ownerEmail, seller.ownerName, seller.shopName),
    reject: () => sendShopRejectedEmail(seller.ownerEmail, seller.ownerName, seller.shopName, input.reason),
    suspend: () => sendShopSuspendedEmail(seller.ownerEmail, seller.ownerName, seller.shopName, input.reason),
    reinstate: () => sendShopReinstatedEmail(seller.ownerEmail, seller.ownerName, seller.shopName),
  }[input.decision];
  await mail().catch(() => undefined);

  if (input.decision === "suspend") {
    const open = await countOpenShopPackages(input.id);
    return {
      ok: true,
      message: `${seller.shopName} is suspended and its products are hidden.${
        open ? ` It still has ${open} open package${open === 1 ? "" : "s"} — handle them under Orders.` : ""
      }`,
    };
  }
  return {
    ok: true,
    message: {
      approve: `${seller.shopName} is approved. The owner was emailed and can sell now.`,
      reject: `${seller.shopName} was rejected. The owner was emailed the reason.`,
      reinstate: `${seller.shopName} is active again and its products are back in the store.`,
    }[input.decision],
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
