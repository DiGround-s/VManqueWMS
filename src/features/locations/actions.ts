"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/server/action";
import { db } from "@/server/db";
import { UserError } from "@/server/errors";
import { generateLocations } from "@/server/domain/locations";

const id = z.string().min(1).max(40);
const n = z.coerce.number().int().min(1).max(99);
const role = z.enum(["PICK", "RESERVE", "DOCK"]);

export const generateLocationsAction = action(
  "SUPERVISOR",
  z.object({ warehouseId: id, zone: z.string().trim().min(1).max(3), aisleFrom: n, aisleTo: n, rackFrom: n, rackTo: n, levelFrom: n, levelTo: n, role }),
  async ({ warehouseId, role, ...spec }) => {
    let locs;
    try {
      locs = generateLocations(spec);
    } catch (e) {
      throw new UserError((e as Error).message);
    }
    const res = await db.location.createMany({ data: locs.map((l) => ({ ...l, warehouseId, role })), skipDuplicates: true });
    revalidatePath("/", "layout");
    return { created: res.count, skipped: locs.length - res.count };
  },
);

export const createLocationAction = action(
  "SUPERVISOR",
  z.object({ warehouseId: id, code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{1,30}$/, "Código: letras, números y guiones"), zone: z.string().trim().min(1).max(20), role, sortKey: z.coerce.number().int().min(0).default(0) }),
  async (i) => {
    await db.location.create({ data: i });
    revalidatePath("/", "layout");
  },
);

export const updateLocationAction = action(
  "SUPERVISOR",
  z.object({ id, role, active: z.boolean(), sortKey: z.coerce.number().int().min(0) }),
  async ({ id, ...data }) => {
    if (!data.active) {
      const stock = await db.stockLevel.aggregate({ where: { locationId: id }, _sum: { qty: true } });
      if ((stock._sum.qty ?? 0) > 0) throw new UserError("La ubicación tiene stock: vacíala antes de desactivarla");
    }
    await db.location.update({ where: { id }, data });
    revalidatePath("/", "layout");
  },
);
