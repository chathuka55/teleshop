import "server-only";
import {
  findUserRole,
  listAuditLog,
  listReviewsForAdmin,
  listUsersForAdmin,
  setReviewStatus,
  setUserStatus,
} from "@/db/repositories/admin-people.repository";
import {
  collectedPackages,
  insertPayout,
  lastPayoutEnd,
  listPayableShops,
  listPayouts,
  markPayoutPaid,
} from "@/db/repositories/payout.repository";
import { addRatingToCaches, removeRatingFromCaches } from "@/db/repositories/review.repository";
import { findSellerContacts } from "@/db/repositories/seller.repository";
import { getSettings } from "@/db/repositories/settings.repository";
import { withTransaction } from "@/db/mongoose";
import { assertRole } from "@/lib/auth/authorize";
import type { SessionUser } from "@/lib/auth/claims";
import { audit } from "@/modules/audit/service";
import type { AdminActionResult } from "@/modules/orders/admin-types";
import { platformFee } from "@/modules/sellers/access";
import { AUDIT_GROUPS } from "./audit-groups";
import { sendPayoutPaidEmail } from "./emails";
import type {
  AdminCustomerDTO,
  AdminPayoutDTO,
  AdminReviewDTO,
  AuditEntryDTO,
  Paged,
  PayoutCandidateDTO,
} from "./types";

/**
 * Admin: customers (A9), reviews (A11), payouts, audit log (A14). Each function asserts the admin
 * role (TOTP passed) first; every write is audit-logged.
 */

const fail = (message: string, fields?: Record<string, string>): AdminActionResult => ({
  ok: false,
  message,
  ...(fields ? { fields } : {}),
});

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

// ---- Customers (A9) ----

export async function listCustomersFor(
  user: SessionUser | null,
  f: { q: string; role?: AdminCustomerDTO["role"]; status?: AdminCustomerDTO["status"]; page: number },
): Promise<Paged<AdminCustomerDTO>> {
  assertRole(user, ["admin"]);
  return listUsersForAdmin({ ...f, pageSize: 25 });
}

/** Suspend (signed out everywhere, can't sign in) or reactivate. Never admins, never yourself. */
export async function setCustomerStatusFor(
  user: SessionUser | null,
  input: { id: string; status: "active" | "suspended"; reason: string },
  ctx: { ip: string | null },
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  if (input.id === admin.id) return fail("You can't suspend your own account.");
  const target = await findUserRole(input.id);
  if (!target) return fail("We couldn't find that account.");
  if (target.role === "admin") return fail("Admin accounts can't be suspended here.");
  if (input.status === "suspended" && !input.reason) {
    return fail("Give a reason — it goes into the audit log.", { reason: "Give a reason" });
  }
  if (!(await setUserStatus(input.id, input.status))) {
    return fail("This account changed meanwhile. Reload the page.");
  }
  await audit.log({
    actorId: admin.id,
    actorRole: "admin",
    action: input.status === "suspended" ? "user.suspended" : "user.reactivated",
    entity: "user",
    entityId: input.id,
    data: input.reason ? { reason: input.reason } : {},
    ip: ctx.ip,
  });
  return {
    ok: true,
    message:
      input.status === "suspended"
        ? `${target.email} is suspended and will be signed out within 5 minutes.${
            target.role === "seller" ? " Their shop stays live — suspend it under Shops if needed." : ""
          }`
        : `${target.email} can sign in again.`,
  };
}

// ---- Reviews (A11) ----

export async function listReviewsFor(
  user: SessionUser | null,
  status: AdminReviewDTO["status"],
  page: number,
): Promise<Paged<AdminReviewDTO>> {
  assertRole(user, ["admin"]);
  return listReviewsForAdmin(status, page, 25);
}

/** Hide or show a review. The product and shop ratings follow in the same transaction. */
export async function moderateReviewFor(
  user: SessionUser | null,
  input: { id: string; action: "hide" | "show"; reason: string },
  ctx: { ip: string | null },
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  if (input.action === "hide" && !input.reason) {
    return fail("Give a reason — it goes into the audit log.", { reason: "Give a reason" });
  }
  const changed = await withTransaction(async (session) => {
    const r =
      input.action === "hide"
        ? await setReviewStatus(input.id, ["visible", "flagged"], "hidden", session)
        : await setReviewStatus(input.id, ["hidden"], "visible", session);
    if (!r) return false;
    // A flagged review was never counted out, so only visible ⇄ hidden moves the numbers.
    if (input.action === "hide") await removeRatingFromCaches(r.productId, r.sellerId, r.rating, session);
    else await addRatingToCaches(r.productId, r.sellerId, r.rating, session);
    return true;
  });
  if (!changed) return fail("This review changed meanwhile. Reload the page.");
  await audit.log({
    actorId: admin.id,
    actorRole: "admin",
    action: input.action === "hide" ? "review.hidden" : "review.shown",
    entity: "review",
    entityId: input.id,
    data: input.reason ? { reason: input.reason } : {},
    ip: ctx.ip,
  });
  return {
    ok: true,
    message:
      input.action === "hide" ? "Review hidden. The ratings no longer count it." : "Review is visible again.",
  };
}

// ---- Payouts ----

/** Every shop with collected COD not yet in a payout, up to `now`. */
export async function listPayoutCandidatesFor(
  user: SessionUser | null,
  now = new Date(),
): Promise<PayoutCandidateDTO[]> {
  assertRole(user, ["admin"]);
  const [shops, settings] = await Promise.all([listPayableShops(), getSettings()]);
  const out: PayoutCandidateDTO[] = [];
  for (const shop of shops) {
    const since = await lastPayoutEnd(shop.id);
    const pkgs = await collectedPackages(shop.id, since, now);
    if (!pkgs.length) continue;
    const items = pkgs.reduce((n, p) => n + p.itemsCents, 0);
    const gross = items + pkgs.reduce((n, p) => n + p.deliveryCents, 0);
    const fee = platformFee(items, settings.platformFeeBp);
    const first = pkgs.reduce((a, p) => (p.collectedAt < a ? p.collectedAt : a), pkgs[0]?.collectedAt ?? now);
    out.push({
      sellerId: shop.id,
      shopName: shop.shopName,
      shopStatus: shop.status,
      bank: shop.bank,
      periodStart: (since ?? first).toISOString(),
      packageCount: pkgs.length,
      grossCents: gross,
      feeCents: fee,
      netCents: gross - fee,
    });
  }
  return out;
}

/** Schedules a payout of everything collected since the shop's last payout, up to now. */
export async function createPayoutFor(
  user: SessionUser | null,
  sellerId: string,
  ctx: { ip: string | null; now?: Date },
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  const now = ctx.now ?? new Date();
  const shop = (await listPayableShops()).find((s) => s.id === sellerId);
  if (!shop) return fail("We couldn't find that shop.");
  if (!shop.bank)
    return fail("This shop hasn't added its bank account yet — ask them to add it in Shop settings.");
  const [since, settings] = await Promise.all([lastPayoutEnd(sellerId), getSettings()]);
  const pkgs = await collectedPackages(sellerId, since, now);
  if (!pkgs.length) return fail("Nothing to pay out for this shop.");
  const items = pkgs.reduce((n, p) => n + p.itemsCents, 0);
  const gross = items + pkgs.reduce((n, p) => n + p.deliveryCents, 0);
  const fee = platformFee(items, settings.platformFeeBp);
  const first = pkgs.reduce((a, p) => (p.collectedAt < a ? p.collectedAt : a), pkgs[0]?.collectedAt ?? now);
  const periodStart = since ?? first;
  let id: string;
  try {
    id = await insertPayout({
      sellerId,
      periodStart,
      periodEnd: now,
      orderCount: new Set(pkgs.map((p) => p.orderNo)).size,
      grossCents: gross,
      feeCents: fee,
      netCents: gross - fee,
    });
  } catch (e) {
    // Unique { sellerId, periodStart }: another admin created this payout at the same moment.
    if (isDuplicateKey(e)) return fail("This payout was just created. Reload the page.");
    throw e;
  }
  await audit.log({
    actorId: admin.id,
    actorRole: "admin",
    action: "payout.scheduled",
    entity: "payout",
    entityId: id,
    data: { sellerId, packages: pkgs.length, netCents: gross - fee },
    ip: ctx.ip,
  });
  return { ok: true, message: "Payout scheduled. Transfer the money, then mark it paid with the reference." };
}

async function shopsByIds(ids: string[]) {
  const shops = await listPayableShops();
  const contacts = await findSellerContacts(ids).catch(() => []);
  return {
    shop: new Map(shops.map((s) => [s.id, s])),
    contact: new Map(contacts.map((c) => [c.sellerId, c])),
  };
}

export async function listPayoutsFor(
  user: SessionUser | null,
  status: "scheduled" | "paid",
): Promise<AdminPayoutDTO[]> {
  assertRole(user, ["admin"]);
  const rows = await listPayouts(status);
  const { shop } = await shopsByIds(rows.map((r) => r.sellerId));
  return rows.map((r) => ({
    id: r.id,
    sellerId: r.sellerId,
    shopName: shop.get(r.sellerId)?.shopName ?? "Shop",
    bank: shop.get(r.sellerId)?.bank ?? null,
    periodStart: r.periodStart.toISOString(),
    periodEnd: r.periodEnd.toISOString(),
    orderCount: r.orderCount,
    grossCents: r.grossCents,
    feeCents: r.feeCents,
    netCents: r.netCents,
    status: r.status,
    paidAt: r.paidAt?.toISOString() ?? null,
    reference: r.reference,
  }));
}

/** The bank transfer is done: scheduled → paid with its reference, and the shop is emailed. */
export async function markPayoutPaidFor(
  user: SessionUser | null,
  input: { id: string; reference: string },
  ctx: { ip: string | null; now?: Date },
): Promise<AdminActionResult> {
  const admin = assertRole(user, ["admin"]);
  if (!input.reference)
    return fail("Enter the bank transfer reference.", { reference: "Enter the reference" });
  const p = await markPayoutPaid(input.id, input.reference, ctx.now ?? new Date());
  if (!p) return fail("This payout was already marked paid. Reload the page.");
  await audit.log({
    actorId: admin.id,
    actorRole: "admin",
    action: "payout.paid",
    entity: "payout",
    entityId: p.id,
    data: { sellerId: p.sellerId, netCents: p.netCents, reference: input.reference },
    ip: ctx.ip,
  });
  const { shop, contact } = await shopsByIds([p.sellerId]);
  const c = contact.get(p.sellerId);
  const bank = shop.get(p.sellerId)?.bank ?? null;
  if (c) {
    await sendPayoutPaidEmail(c.ownerEmail, c.shopName, p.netCents, input.reference, bank).catch(
      () => undefined,
    );
  }
  return { ok: true, message: "Marked paid. The shop was emailed the reference." };
}

// ---- Audit log (A14) ----

export async function listAuditFor(
  user: SessionUser | null,
  f: { action?: string; entityId?: string; actorEmail?: string; page: number },
): Promise<Paged<AuditEntryDTO>> {
  assertRole(user, ["admin"]);
  const action = f.action && (AUDIT_GROUPS as readonly string[]).includes(f.action) ? f.action : undefined;
  return listAuditLog({ ...f, action, pageSize: 50 });
}
