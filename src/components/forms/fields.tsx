"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { FieldError } from "@/components/ui/Input";

const box =
  "flex h-12 items-center gap-2.5 rounded-[14px] border bg-white/4 px-4 transition-colors focus-within:border-primary-light/60";

/** Labelled input with icon + error, wired with aria-describedby. */
export function TextField({
  label,
  error,
  icon,
  trailing,
  className,
  ...input
}: ComponentProps<"input"> & { label: ReactNode; error?: string; icon?: ReactNode; trailing?: ReactNode }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-text-secondary">
        {label}
      </label>
      <div className={cn(box, error ? "border-danger/60" : "border-line")}>
        {icon && <span className="text-text-muted [&_svg]:size-[18px]">{icon}</span>}
        <input
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
          {...input}
        />
        {trailing}
      </div>
      {error && (
        <div id={`${id}-err`}>
          <FieldError>{error}</FieldError>
        </div>
      )}
    </div>
  );
}

export function PasswordField(props: Omit<ComponentProps<typeof TextField>, "type" | "trailing">) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      {...props}
      type={show ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="-mr-2 grid size-9 place-items-center rounded-lg text-text-muted hover:text-text"
        >
          {show ? (
            <EyeOff aria-hidden className="size-[18px]" />
          ) : (
            <Eye aria-hidden className="size-[18px]" />
          )}
        </button>
      }
    />
  );
}

export function SelectField({
  label,
  error,
  options,
  placeholder,
  className,
  ...select
}: ComponentProps<"select"> & {
  label: ReactNode;
  error?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-text-secondary">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={!!error || undefined}
        className={cn(
          box,
          "w-full text-sm outline-none [&>option]:bg-surface",
          error ? "border-danger/60" : "border-line",
        )}
        {...select}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function CheckboxField({
  name,
  error,
  children,
  defaultChecked,
}: {
  name: string;
  error?: string;
  children: ReactNode;
  defaultChecked?: boolean;
}) {
  return (
    <div>
      <label className="flex min-h-7 cursor-pointer items-start gap-2.5 text-[13px] text-text-secondary">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          aria-invalid={!!error || undefined}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span>{children}</span>
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function FormMessage({ state }: { state: { status: string; message?: string } }) {
  if (state.status === "idle" || !state.message) return null;
  const ok = state.status === "ok";
  return (
    <p
      role={ok ? "status" : "alert"}
      className={cn(
        "rounded-xl border px-4 py-3 text-[13px]",
        ok ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger",
      )}
    >
      {state.message}
    </p>
  );
}
