"use client";

import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";
import { transferAction } from "./actions";

export function ReplenishButton(props: { productId: string; fromLocationId: string; toLocationId: string; qty: number }) {
  const [pending, run] = useAction();
  return (
    <Button size="sm" variant="primary" pending={pending} onClick={() => run(() => transferAction({ ...props, note: "Reposición" }), { success: "Reposición registrada" })}>
      Hecho
    </Button>
  );
}
