import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-panel-2", className)} />;
}

export function PageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-9" />)}
      </div>
    </div>
  );
}

export function PhoneSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}
    </div>
  );
}
