import type { ReactNode } from "react";

export function PhoneTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold uppercase tracking-wide">{children}</h1>
      {sub && <p className="text-muted">{sub}</p>}
    </div>
  );
}
