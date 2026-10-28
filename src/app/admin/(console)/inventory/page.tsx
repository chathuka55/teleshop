import type { Metadata } from "next";
import Link from "next/link";
import { adminLowStock } from "@/modules/admin/session";

export const metadata: Metadata = { title: "Stock — Admin", robots: { index: false } };

/** Figma "A8 · Admin — Inventory" (P7-T03): products on sale that are running out, across shops. */
export default async function AdminInventoryPage() {
  const rows = await adminLowStock();
  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">Stock</h1>
      <p className="text-sm text-text-secondary">
        Products on sale at or below their low-stock mark, emptiest first. Shops restock from their own Stock
        page.
      </p>
      {rows.length === 0 ? (
        <p className="mt-6 rounded-[20px] border border-dashed border-line px-6 py-10 text-center text-sm text-text-secondary">
          Nothing is running low.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-[18px] border border-line bg-surface">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-xs text-text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Shop</th>
                <th className="px-4 py-2.5 text-right font-medium">Available</th>
                <th className="px-4 py-2.5 text-right font-medium">Reserved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sku} className="border-t border-line">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/products/${r.productId}`}
                      className="font-semibold hover:text-primary-light"
                    >
                      {r.productName}
                    </Link>
                    <span className="block font-mono text-xs text-text-muted">{r.sku}</span>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">{r.shopName}</td>
                  <td
                    className={`px-4 py-2.5 text-right font-semibold ${r.available === 0 ? "text-danger" : "text-accent"}`}
                  >
                    {r.available === 0 ? "Sold out" : r.available}
                  </td>
                  <td className="px-4 py-2.5 text-right">{r.reserved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
