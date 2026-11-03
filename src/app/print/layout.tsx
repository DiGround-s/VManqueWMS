import { requirePageRole } from "@/server/auth/current";

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole();
  return <div className="min-h-dvh bg-surface print:bg-white">{children}</div>;
}
