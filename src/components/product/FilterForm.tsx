"use client";

import { useRouter } from "next/navigation";
import { useTransition, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Params the listing reads from the URL; everything else in the form is dropped. */
const MULTI = new Set(["brand", "condition"]);

/** Form fields → clean query string: no empty values, repeated checkboxes joined with commas. */
export function filtersToSearch(form: HTMLFormElement): string {
  const grouped = new Map<string, string[]>();
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value !== "string" || value.trim() === "") continue;
    grouped.set(key, [...(grouped.get(key) ?? []), value.trim()]);
  }
  const params = new URLSearchParams();
  for (const [key, values] of grouped) {
    params.set(key, MULTI.has(key) || key.startsWith("spec.") ? values.join(",") : (values[0] ?? ""));
  }
  return params.toString();
}

/**
 * Filter sidebar form. Without JS it is a plain GET form (Apply button). With JS every checkbox
 * applies immediately, price boxes apply on Enter / leaving the field, and navigation stays
 * client-side (no full reload). The listing dims while the new results load.
 */
export function FilterForm({
  action,
  className,
  children,
}: {
  action: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (form: HTMLFormElement): void => {
    const search = filtersToSearch(form);
    startTransition(() => router.push(search ? `${action}?${search}` : action, { scroll: false }));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    go(e.currentTarget);
  };

  return (
    <form
      method="get"
      action={action}
      onSubmit={onSubmit}
      onChange={(e) => {
        const t = e.target;
        if ((t instanceof HTMLInputElement && t.type === "checkbox") || t instanceof HTMLSelectElement) {
          go(e.currentTarget);
        }
      }}
      onBlur={(e) => {
        const t = e.target;
        if (t instanceof HTMLInputElement && t.type === "number" && t.value !== t.defaultValue) {
          go(e.currentTarget);
        }
      }}
      data-pending={pending || undefined}
      aria-busy={pending}
      className={cn("group/filters", className)}
    >
      {children}
    </form>
  );
}
