import type { LocationRole, MovementType, OrderStatus, PickTaskStatus, Role, WaveStatus } from "@prisma/client";

export type Tone = "neutral" | "accent" | "success" | "danger" | "info" | "warn";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pendiente", tone: "neutral" },
  IN_WAVE: { label: "En ola", tone: "info" },
  PICKED: { label: "Recogido", tone: "info" },
  SORTED: { label: "Separado", tone: "accent" },
  PACKED: { label: "Empacado", tone: "warn" },
  SHIPPED: { label: "Despachado", tone: "success" },
  CANCELLED: { label: "Cancelado", tone: "danger" },
};

export const WAVE_STATUS: Record<WaveStatus, { label: string; tone: Tone }> = {
  OPEN: { label: "Abierta", tone: "neutral" },
  PICKING: { label: "Recogiendo", tone: "info" },
  SORTING: { label: "En mesa", tone: "accent" },
  DONE: { label: "Terminada", tone: "success" },
  CANCELLED: { label: "Cancelada", tone: "danger" },
};

export const TASK_STATUS: Record<PickTaskStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pendiente", tone: "neutral" },
  DONE: { label: "Listo", tone: "success" },
  SHORT: { label: "Falta", tone: "danger" },
};

export const LOCATION_ROLE: Record<LocationRole, { label: string; tone: Tone }> = {
  PICK: { label: "Picking", tone: "accent" },
  RESERVE: { label: "Reserva", tone: "info" },
  DOCK: { label: "Andén", tone: "neutral" },
};

export const MOVEMENT_TYPE: Record<MovementType, { label: string; tone: Tone }> = {
  RECEIPT: { label: "Recepción", tone: "success" },
  PUTAWAY: { label: "Ubicación", tone: "info" },
  TRANSFER: { label: "Traspaso", tone: "info" },
  ADJUSTMENT: { label: "Ajuste", tone: "warn" },
  PICK: { label: "Picking", tone: "accent" },
  RETURN: { label: "Reposición", tone: "success" },
  SHIP: { label: "Despacho", tone: "neutral" },
};

export const ROLE: Record<Role, string> = { ADMIN: "Administrador", SUPERVISOR: "Supervisor", OPERATOR: "Operador" };

export const ORDER_FLOW: OrderStatus[] = ["PENDING", "IN_WAVE", "PICKED", "SORTED", "PACKED", "SHIPPED"];
