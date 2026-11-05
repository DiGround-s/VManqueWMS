import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Plain GET form: filters live in the URL, no client JS needed. */
export function FilterForm({ children, action }: { children: ReactNode; action?: string }) {
  return (
    <form action={action} className="mb-5 flex flex-wrap items-end gap-2 rounded-3xl bg-panel p-3 shadow-card ring-1 ring-border/60">
      {children}
      <Button type="submit" variant="secondary">
        <Search className="size-4" /> Filtrar
      </Button>
    </form>
  );
}
