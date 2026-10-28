import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Pager, queryHref } from "@/components/admin/Pager";
import { cn } from "@/lib/utils/cn";
import { AUDIT_GROUPS } from "@/modules/admin/audit-groups";
import { adminAudit } from "@/modules/admin/session";

export const metadata: Metadata = { title: "Audit log — Admin", robots: { index: false } };

type Props = { searchParams: Promise<{ group?: string; id?: string; actor?: string; page?: string }> };

/** Figma "A14 · Admin — Audit log" (P7-T05): read-only, newest first. IPs are stored hashed only. */
export default async function AuditLogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const group = AUDIT_GROUPS.find((g) => g === sp.group);
  const id = (sp.id ?? "").trim().slice(0, 64);
  const actor = (sp.actor ?? "").trim().slice(0, 254);
  const page = Math.min(10_000, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  const { rows, total, pageSize } = await adminAudit({
    action: group,
    entityId: id || undefined,
    actorEmail: actor || undefined,
    page,
  });
  const href = (p: { group?: string; page?: number }) =>
    queryHref("/admin/audit-log", { group: p.group, id, actor, page: p.page });

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Audit log</h1>
      <p className="text-sm text-text-secondary">
        Every sign-in, order change, approval and payout. Entries can&apos;t be edited or deleted.
      </p>
      <nav
        aria-label="Filter by area"
        className="no-scrollbar mt-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-[14px] bg-white/4 p-1"
      >
        {[undefined, ...AUDIT_GROUPS].map((g) => (
          <Link
            key={g ?? "all"}
            href={href({ group: g })}
            aria-current={g === group ? "page" : undefined}
            className={cn(
              "rounded-[10px] px-3 py-2 text-[13px] font-semibold whitespace-nowrap",
              g === group ? "bg-primary text-on-primary" : "text-text-secondary hover:text-text",
            )}
          >
            {g ? g.replace(".", "") : "All"}
          </Link>
        ))}
      </nav>
      <form action="/admin/audit-log" className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        {group && <input type="hidden" name="group" value={group} />}
        <input
          name="id"
          defaultValue={id}
          maxLength={64}
          placeholder="Order no. or record id"
          aria-label="Order number or record id"
          className="h-11 rounded-[14px] border border-line bg-white/4 px-4 text-sm outline-none placeholder:text-text-muted focus:border-primary-light/60"
        />
        <input
          name="actor"
          type="email"
          defaultValue={actor}
          maxLength={254}
          placeholder="Done by (email)"
          aria-label="Done by (email)"
          className="h-11 rounded-[14px] border border-line bg-white/4 px-4 text-sm outline-none placeholder:text-text-muted focus:border-primary-light/60"
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border border-line-strong bg-white/6 px-4 text-sm font-semibold hover:bg-white/10"
        >
          <Search aria-hidden className="size-4" /> Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-[20px] border border-dashed border-line px-6 py-10 text-center text-sm text-text-secondary">
          No entries match.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-[18px] border border-line bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Who</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Record</th>
                <th className="px-4 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-text-secondary">
                    {new Date(r.at).toLocaleString("en-LK", {
                      timeZone: "Asia/Colombo",
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="block">{r.actorEmail ?? "—"}</span>
                    <span className="text-xs text-text-muted">{r.actorRole}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.action}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {r.entity === "order" ? (
                      <Link
                        href={`/admin/orders/${r.entityId}`}
                        className="text-primary-light hover:text-text"
                      >
                        {r.entityId}
                      </Link>
                    ) : (
                      <span className="text-text-secondary">
                        {r.entity} <span className="font-mono">{r.entityId}</span>
                      </span>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-2.5 font-mono text-[11px] break-all text-text-secondary">
                    {r.data}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        page={page}
        total={total}
        pageSize={pageSize}
        noun="entries"
        href={(p) => href({ group, page: p })}
      />
    </div>
  );
}
