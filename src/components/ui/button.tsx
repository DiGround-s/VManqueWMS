import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink border-accent hover:brightness-110 active:brightness-95 shadow-[0_1px_0_rgb(0_0_0/0.12)]",
  secondary: "bg-panel text-text border-border-strong hover:bg-panel-2 hover:border-text/40",
  danger: "bg-panel text-danger border-danger/60 hover:bg-danger hover:text-white hover:border-danger",
  success: "bg-success text-white border-success hover:brightness-110 dark:text-surface",
  ghost: "bg-transparent text-text border-transparent hover:bg-panel-2",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-sm",
  md: "h-10 px-4 text-sm gap-2 rounded-md",
  lg: "h-12 px-5 text-base gap-2 rounded-md",
  xl: "min-h-14 px-5 text-lg gap-3 w-full rounded-lg",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  pending?: boolean;
};

export const buttonClass = (variant: Variant = "secondary", size: Size = "md", extra?: string) =>
  cn(
    "inline-flex items-center justify-center border-2 font-bold transition-[background-color,border-color,color,filter] duration-150 select-none",
    "disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:brightness-100",
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
