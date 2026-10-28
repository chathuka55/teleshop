import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { CategoryEditor, type CategoryEditorValue } from "@/components/admin/CategoryEditor";
import { objectId } from "@/lib/validation/common";
import { categoryIcons } from "@/modules/admin/config-schema";
import { adminCategory } from "@/modules/admin/session";

export const metadata: Metadata = { title: "Category — Admin", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export default async function AdminCategoryPage({ params, searchParams }: Props) {
  const id = objectId.safeParse((await params).id);
  if (!id.success) notFound();
  const c = await adminCategory(id.data);
  if (!c) notFound();
  const created = (await searchParams).created === "1";
  const value: CategoryEditorValue = {
    id: c.id,
    name: c.name,
    icon: categoryIcons.find((i) => i === c.icon) ?? "phone",
    requiresSerial: c.requiresSerial,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
    specTemplate: c.specTemplate,
  };
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] text-text-secondary">
          <Link href="/admin/catalog" className="hover:text-text">
            Catalog
          </Link>{" "}
          / {c.name}
        </p>
        <h1 className="mt-1 font-display text-[28px] font-bold tracking-[-0.02em] md:text-[34px]">
          {c.name}
        </h1>
        <p className="text-sm text-text-secondary">Store link: /c/{c.slug} (fixed)</p>
      </header>
      {created && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-[18px] border border-success/35 bg-success/10 px-4 py-3 text-sm"
        >
          <CircleCheck aria-hidden className="size-5 text-success" /> Category added.
        </p>
      )}
      <CategoryEditor
        key={c.specTemplate.map((f) => f.key).join()}
        category={value}
        productCount={c.products}
      />
    </div>
  );
}
