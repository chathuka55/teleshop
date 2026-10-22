import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({
  className,
  icon,
  invalid,
  ...props
}: ComponentProps<"input"> & { icon?: ReactNode; invalid?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-12 items-center gap-2.5 rounded-[14px] border bg-white/4 px-4 transition-colors focus-within:border-primary-light/60",
        invalid ? "border-danger/60" : "border-line",
        className,
      )}
    >
      {icon && <span className="text-text-muted [&_svg]:size-[18px]">{icon}</span>}
      <input
        aria-invalid={invalid || undefined}
        className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
        {...props}
      />
    </div>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label className={cn("mb-2 block text-[13px] font-medium text-text-secondary", className)} {...props} />
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs text-danger">
      {children}
    </p>
  );
}
