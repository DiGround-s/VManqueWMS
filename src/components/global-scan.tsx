"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScanInput } from "@/components/ui/scan-input";
import { useAction } from "@/lib/use-action";
import { beep } from "@/lib/beep";
import { scanInfoAction } from "@/features/scan/actions";

/** Office header scan: jumps straight to the product, location or order that was scanned. */
export function GlobalScan() {
  const router = useRouter();
  const [pending, run] = useAction();
  return (
    <div className="w-full max-w-md">
      <ScanInput
        autoFocus={false}
        pending={pending}
        placeholder="Escanea o busca un pedido, producto o ubicación"
        onScan={(code) =>
          run(() => scanInfoAction({ code }), {
            onOk: (r) => {
              if (r.type === "none") {
                beep(false, `No se encontró ${r.code}`);
                return void toast.error(`No se encontró «${r.code}»`);
              }
              beep(true);
              if (r.type === "product") router.push(`/productos/${r.id}`);
              if (r.type === "location") router.push(`/ubicaciones/${r.id}`);
              if (r.type === "order") router.push(`/pedidos/${r.code}`);
            },
          })
        }
      />
    </div>
  );
}
