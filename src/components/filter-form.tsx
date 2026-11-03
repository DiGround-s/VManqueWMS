import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Plain GET form: filters live in the URL, no client JS needed. */
export function FilterForm({ children, action }: { children: ReactNode; action?: string }) {
  return (
    <form action={action} className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-border bg-panel p-3">
      {children}
      <Button type="submit" variant="secondary">
        <Search className="size-4" /> Filtrar
      </Button>
    </form>
  );
}
