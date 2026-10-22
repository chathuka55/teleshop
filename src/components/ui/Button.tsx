import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "glass" | "outline" | "danger" | "light" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-primary text-on-primary shadow-[0_8px_24px_rgb(29_78_216/0.34)] hover:brightness-110 active:brightness-95",
  glass: "border border-line-strong bg-white/6 text-text hover:bg-white/10",
  outline: "border border-white/10 text-text hover:border-white/20 hover:bg-white/5",
  danger: "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15",
  light: "bg-white text-[#0b1220] hover:bg-white/90",
  ghost: "text-text-secondary hover:bg-white/6 hover:text-text",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 gap-2 rounded-xl px-3.5 text-[13px]",
  md: "h-11 gap-2 rounded-xl px-5 text-[15px]",
  lg: "h-12 gap-2 rounded-xl px-6 text-[15px]",
  icon: "size-11 rounded-[14px]",
  "icon-sm": "size-10 rounded-xl",
};

const base =
  "inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold whitespace-nowrap transition-[background,filter,border-color,color] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0";

type CommonProps = { variant?: ButtonVariant; size?: ButtonSize; className?: string; children?: ReactNode };

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: Omit<CommonProps, "children">): string {
  return cn(base, variantClass[variant], sizeClass[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: CommonProps & ComponentProps<"button">) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
