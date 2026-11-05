"use client";

import { useRouter } from "next/navigation";
import { ScanInput } from "@/components/ui/scan-input";

/** Phone home: scanning anything opens Consultar with that code already looked up. */
export function PhoneHomeScan() {
  const router = useRouter();
  return <ScanInput size="xl" autoFocus={false} placeholder="Escanea o busca un producto…" onScan={(code) => router.push(`/m/consultar?c=${encodeURIComponent(code)}`)} />;
}
