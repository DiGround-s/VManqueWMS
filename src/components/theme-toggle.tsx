"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn("flex size-9 items-center justify-center rounded-md border-2 border-border hover:bg-panel-2", className)}
      aria-label="Cambiar tema claro/oscuro"
      title="Cambiar tema"
    >
      <Sun className="hidden size-4 dark:block" />
      <Moon className="size-4 dark:hidden" />
    </button>
  );
}
