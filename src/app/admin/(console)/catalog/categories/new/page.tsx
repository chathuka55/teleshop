import type { Metadata } from "next";
import Link from "next/link";
import { CategoryEditor } from "@/components/admin/CategoryEditor";

export const metadata: Metadata = { title: "New category — Admin", robots: { index: false } };

export default function NewCategoryPage() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] text-text-secondary">
          <Link href="/admin/catalog" className="hover:text-text">
            Catalog
          </Link>{" "}
          / New category
        </p>
        <h1 className="mt-1 font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          Add a category
        </h1>
      </header>
      <CategoryEditor productCount={0} />
    </div>
  );
}
