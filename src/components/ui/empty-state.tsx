import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="mb-1 flex size-14 items-center justify-center rounded-full bg-panel-2 text-muted">
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </div>
      <p className="font-semibold">{title}</p>
      {children && <div className="max-w-[48ch] text-sm text-muted">{children}</div>}
    </div>
  );
}
