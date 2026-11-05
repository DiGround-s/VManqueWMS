import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base =
  "min-w-0 rounded-md border-2 border-border bg-panel px-3 text-sm text-text placeholder:text-muted/80 transition-colors hover:border-border-strong focus:border-accent focus:outline-none disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(base, "h-10", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(base, "py-2 min-h-20", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...rest }, ref) {
  return <select ref={ref} className={cn(base, "h-10 pr-8", className)} {...rest} />;
});

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-bold">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
