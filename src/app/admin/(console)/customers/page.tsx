import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { DecisionForm } from "@/components/admin/DecisionForm";
import { Pager, queryHref } from "@/components/admin/Pager";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { formatPhoneLK } from "@/lib/utils/strings";
import { adminCustomers } from "@/modules/admin/session";

export const metadata: Metadata = { title: "Customers — Admin", robots: { index: false } };

type Props = { searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }> };

const roles = ["customer", "seller", "admin"] as const;
const tabs = [
  { key: "", label: "All" },
  { key: "customer", label: "Customers" },
  { key: "seller", label: "Sellers" },
  { key: "admin", label: "Admins" },
  { key: "suspended", label: "Suspended" },
] as const;

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" });

/** Figma "A9 · Admin — Customers" (P7-T04): search, roles, suspend / reactivate. */
export default async function AdminCustomersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const role = roles.find((r) => r === sp.role);
  const status = sp.status === "suspended" ? ("suspended" as const) : undefined;
  const page = Math.min(10_000, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  const tab = status ? "suspended" : (role ?? "");
  const { rows, total, pageSize } = await adminCustomers({ q, role, status, page });
  const tabHref = (key: string) =>
    queryHref("/admin/customers", {
      q,
      ...(key === "suspended" ? { status: "suspended" } : key ? { role: key } : {}),
    });

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Customers</h1>
      <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <nav
          aria-label="Filter accounts"
          className="no-scrollbar flex w-fit max-w-full gap-1 overflow-x-auto rounded-[14px] bg-white/4 p-1"
        >
          {tabs.map((t) => (
            <Link
              key={t.key || "all"}
              href={tabHref(t.key)}
              aria-current={t.key === tab ? "page" : undefined}
              className={cn(
                "rounded-[10px] px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap",
                t.key === tab ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <form action="/admin/customers" role="search" className="xl:w-80">
          {role && <input type="hidden" name="role" value={role} />}
          {status && <input type="hidden" name="status" value={status} />}
          <label className="flex h-11 items-center gap-2.5 rounded-[14px] border border-line bg-white/4 px-4 focus-within:border-primary-light/60">
            <Search aria-hidden className="size-4 text-text-muted" />
            <span className="sr-only">Search accounts</span>
            <input
              name="q"
              type="search"
              defaultValue={q}
              maxLength={80}
              placeholder="Name, email or mobile"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
            />
          </label>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-[20px] border border-dashed border-line px-6 py-10 text-center text-sm text-text-secondary">
          No accounts match.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {rows.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4 md:flex-row md:items-center"
            >
              <div className="min-w-0 flex-1 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {u.name}
                  <Badge
                    tone={u.role === "admin" ? "primary" : u.role === "seller" ? "accent" : "neutral"}
                    size="xs"
                  >
                    {u.role}
                  </Badge>
                  {u.status === "suspended" && (
                    <Badge tone="danger" size="xs">
                      suspended
                    </Badge>
                  )}
                  {!u.emailVerified && (
                    <Badge tone="neutral" size="xs">
                      email not verified
                    </Badge>
                  )}
                </p>
                <p className="truncate text-text-secondary">
                  {u.email}
                  {u.phone && ` · ${formatPhoneLK(u.phone)}`}
                  {u.shopName && ` · ${u.shopName}`}
                </p>
                <p className="text-xs text-text-muted">
                  Joined {day(u.joinedAt)}
                  {u.lastLoginAt && ` · last sign-in ${day(u.lastLoginAt)}`} ·{" "}
                  {u.orderCount ? (
                    <Link
                      href={`/admin/orders?q=${encodeURIComponent(u.email)}`}
                      className="text-primary-light hover:text-text"
                    >
                      {u.orderCount} order{u.orderCount === 1 ? "" : "s"}
                    </Link>
                  ) : (
                    "no orders"
                  )}
                </p>
              </div>
              {u.role !== "admin" && (
                <div className="md:max-w-sm">
                  <DecisionForm
                    kind="customer"
                    id={u.id}
                    allowed={u.status === "suspended" ? ["active"] : ["suspended"]}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pager
        page={page}
        total={total}
        pageSize={pageSize}
        noun="accounts"
        href={(p) => queryHref("/admin/customers", { q, role, status, page: p })}
      />
    </div>
  );
}
