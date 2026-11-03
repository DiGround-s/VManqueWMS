"use client";

import type { WaveStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useAction } from "@/lib/use-action";
import { assignWaveAction, cancelWaveAction, closeWaveAction } from "./actions";

export function WaveActions({ id, status, assignedUserId, operators, canCancel }: { id: string; status: WaveStatus; assignedUserId: string | null; operators: { id: string; name: string }[]; canCancel: boolean }) {
  const [pending, run] = useAction();
  const open = status === "OPEN" || status === "PICKING";
  return (
    <>
      {open && (
        <Select
          defaultValue={assignedUserId ?? ""}
          disabled={pending}
          className="w-48"
          aria-label="Asignar operador"
          onChange={(e) => run(() => assignWaveAction({ id, userId: e.target.value || null }), { success: "Operador actualizado" })}
        >
          <option value="">Sin asignar</option>
          {operators.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
      )}
      {open && canCancel && (
        <Button variant="danger" pending={pending} onClick={() => confirm("¿Cancelar la ola? Los pedidos vuelven a pendientes.") && run(() => cancelWaveAction({ id }), { success: "Ola cancelada" })}>
          Cancelar ola
        </Button>
      )}
      {status === "SORTING" && (
        <Button pending={pending} onClick={() => confirm("¿Cerrar la ola aunque queden pedidos sin separar?") && run(() => closeWaveAction({ id }), { success: "Ola cerrada" })}>
          Cerrar ola
        </Button>
      )}
    </>
  );
}
