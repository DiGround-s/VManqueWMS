import type { ReactNode } from "react";

export function PhoneTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-3xl font-black tracking-tight">{children}</h1>
      {sub && <p className="mt-0.5 text-[15px] text-muted">{sub}</p>}
    </div>
  );
}
