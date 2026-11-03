import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink border-accent-strong hover:brightness-95",
  secondary: "bg-panel text-text border-border-strong hover:bg-panel-2",
  danger: "bg-danger text-white border-danger hover:brightness-110",
  success: "bg-success text-white border-success hover:brightness-110 dark:text-black",
  ghost: "bg-transparent text-text border-transparent hover:bg-panel-2",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs gap-1.5",
  md: "h-10 px-3.5 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
  xl: "min-h-14 px-5 text-lg gap-3 w-full",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  pending?: boolean;
};

export const buttonClass = (variant: Variant = "secondary", size: Size = "md", extra?: string) =>
  cn(
    "inline-flex items-center justify-center rounded-md border font-semibold uppercase tracking-wide transition select-none",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    extra,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", pending, disabled, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || pending} aria-busy={pending || undefined} className={buttonClass(variant, size, className)} {...rest}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
