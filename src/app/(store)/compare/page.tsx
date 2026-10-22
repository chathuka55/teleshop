import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, X } from "lucide-react";
import { z } from "zod";
import { formatLKR } from "@/lib/utils/money";
import { ButtonLink } from "@/components/ui/Button";
import { ProductArt } from "@/components/product/ProductArt";
import { Stars } from "@/components/product/Rating";
import { getProductsBySlugs } from "@/modules/catalog/service";
import type { RawSearchParams } from "@/modules/catalog/schema";

export const metadata: Metadata = { title: "Compare products", robots: { index: false } };

const MAX = 4;
const slugList = z
  .string()
  .max(400)
  .transform((s) => s.split(",").filter((x) => /^[a-z0-9-]{1,80}$/.test(x)));

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Figma "20 · Compare Products" (22:2541). State lives in the URL: /compare?p=a,b,c (max 4). */
export default async function ComparePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams;
  const current = [...new Set(slugList.parse(one(sp.p)))].slice(0, MAX);
  const add = slugList.parse(one(sp.add))[0];
  if (add) {
    const next = [...new Set([...current, add])].slice(-MAX);
    redirect(`/compare?p=${next.join(",")}`);
  }

  const products = await getProductsBySlugs(current);
  const hrefWithout = (slug: string): string => {
    const rest = current.filter((s) => s !== slug);
    return rest.length ? `/compare?p=${rest.join(",")}` : "/compare";
  };
  const specLabels = [...new Set(products.flatMap((p) => p.specs.map((s) => s.label)))];

  return (
    <div className="container-page pt-8 pb-16 md:pt-10">
      <h1 className="font-display text-[32px] font-bold tracking-[-0.02em] md:text-[40px]">
        Compare products
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Side by side, up to {MAX} products. Share this page’s link to share the comparison.
      </p>

      {products.length === 0 ? (
        <div className="mt-8 rounded-[22px] border border-line bg-surface p-10 text-center">
          <p className="font-semibold">Nothing to compare yet</p>
          <p className="mt-1 text-sm text-text-secondary">
            Open any product and tap the compare button to add it here.
          </p>
          <ButtonLink href="/shop" className="mt-5">
            Browse products
          </ButtonLink>
        </div>
      ) : (
        <div className="no-scrollbar mt-8 overflow-x-auto rounded-[22px] border border-line bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">Product comparison</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="w-44 p-4 text-left align-bottom text-xs font-semibold text-text-secondary"
                >
                  Product
                </th>
                {products.map((p) => (
                  <th key={p.id} scope="col" className="p-4 text-left align-top font-normal">
                    <div className="relative">
                      <ProductArt product={p} artScale={0.7} className="h-36 w-full" />
                      <Link
                        href={hrefWithout(p.slug)}
                        aria-label={`Remove ${p.shortName} from comparison`}
                        className="absolute top-2 right-2 grid size-8 place-items-center rounded-lg bg-black/40 hover:bg-black/60"
                      >
                        <X aria-hidden className="size-4" />
                      </Link>
                    </div>
                    <Link
                      href={`/p/${p.slug}`}
                      className="mt-3 line-clamp-2 block font-semibold hover:text-primary-light"
                    >
                      {p.name}
                    </Link>
                  </th>
                ))}
                {products.length < MAX && (
                  <th scope="col" className="p-4 align-middle">
                    <Link
                      href="/shop"
                      className="grid h-36 place-items-center rounded-[14px] border border-dashed border-line text-text-secondary hover:border-line-strong hover:text-text"
                    >
                      <span className="flex flex-col items-center gap-1 text-xs">
                        <Plus aria-hidden className="size-5" /> Add product
                      </span>
                    </Link>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="[&_tr:nth-child(odd)]:bg-white/3">
              <tr>
                <th scope="row" className="p-4 text-left font-medium text-text-secondary">
                  Price
                </th>
                {products.map((p) => (
                  <td key={p.id} className="p-4 font-display text-lg font-bold">
                    {formatLKR(p.priceCents)}
                  </td>
                ))}
                {products.length < MAX && <td />}
              </tr>
              <tr>
                <th scope="row" className="p-4 text-left font-medium text-text-secondary">
                  Rating
                </th>
                {products.map((p) => (
                  <td key={p.id} className="p-4">
                    <Stars value={p.rating.average} />{" "}
                    <span className="ml-1">{p.rating.average.toFixed(1)}</span>
                  </td>
                ))}
                {products.length < MAX && <td />}
              </tr>
              <tr>
                <th scope="row" className="p-4 text-left font-medium text-text-secondary">
                  Seller
                </th>
                {products.map((p) => (
                  <td key={p.id} className="p-4">
                    {p.seller.shopName}
                  </td>
                ))}
                {products.length < MAX && <td />}
              </tr>
              <tr>
                <th scope="row" className="p-4 text-left font-medium text-text-secondary">
                  Warranty
                </th>
                {products.map((p) => (
                  <td key={p.id} className="p-4">
                    {p.warranty.months} months ({p.warranty.type})
                  </td>
                ))}
                {products.length < MAX && <td />}
              </tr>
              {specLabels.map((label) => (
                <tr key={label}>
                  <th scope="row" className="p-4 text-left font-medium text-text-secondary">
                    {label}
                  </th>
                  {products.map((p) => (
                    <td key={p.id} className="p-4">
                      {p.specs.find((s) => s.label === label)?.value ?? (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  ))}
                  {products.length < MAX && <td />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
