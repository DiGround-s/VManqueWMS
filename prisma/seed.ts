/* Demo data. Refuses to run on a database that already has users unless SEED_RESET=1. */
import { PrismaClient, type LocationRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { locationCode, locationSortKey } from "../src/server/domain/locations";
import { DESCRIPTIONS } from "./product-descriptions";

const db = new PrismaClient();

// Deterministic pseudo-random so every seed looks the same.
let state = 42;
const rand = () => ((state = (state * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

function ean13(base12: string) {
  const sum = [...base12].reduce((n, d, i) => n + Number(d) * (i % 2 ? 3 : 1), 0);
  return base12 + ((10 - (sum % 10)) % 10);
}

const PRODUCTS = [
  "Termo acero inoxidable 1 L", "Mate de calabaza tallado", "Bombilla de alpaca", "Yerba mate 1 kg", "Merkén ahumado 100 g",
  "Sal de mar de Cáhuil 500 g", "Miel de ulmo 500 g", "Mermelada de murta 250 g", "Huesillos secos 500 g", "Mote de trigo 1 kg",
  "Harina tostada 500 g", "Té de boldo 20 bolsitas", "Aceite de rosa mosqueta 30 ml", "Jabón de rosa mosqueta", "Alfajores de manjar caja 12",
  "Chocolate con maqui 100 g", "Calcetines de lana chilota", "Gorro de lana tejido", "Manta de lana 1,5 plazas", "Poncho de lana cruda",
  "Olla de greda de Pomaire", "Paila de greda individual", "Canasto de mimbre mediano", "Tabla de picar de raulí", "Mortero de piedra",
  "Cuchillo de campo artesanal", "Individuales de totora (set 4)", "Vela de cera de abeja", "Aceite de oliva extra virgen 500 ml", "Café de grano tostado 250 g",
];

const CUSTOMERS = [
  "Camila Rojas", "Benjamín Soto", "Valentina Muñoz", "Matías González", "Antonia Díaz", "Joaquín Pérez", "Isidora Contreras", "Tomás Silva",
  "Florencia Morales", "Vicente Araya", "Martina Fuentes", "Agustín Castillo", "Catalina Espinoza", "Maximiliano Tapia", "Josefa Reyes",
];
const COMMUNES = ["Providencia", "Ñuñoa", "Las Condes", "Maipú", "Puente Alto", "La Florida", "Santiago", "Viña del Mar", "Valparaíso", "Concepción", "Temuco", "Rancagua"];
const STREETS = ["Av. Irarrázaval", "Av. Providencia", "Los Leones", "Av. Grecia", "Pedro de Valdivia", "Av. Libertad", "Calle O'Higgins", "Av. Alemania"];
const CARRIERS = ["Starken", "Chilexpress", "Blue Express", "Retiro en tienda"];

async function main() {
  const users = await db.user.count();
  if (users > 0 && process.env.SEED_RESET !== "1") {
    console.log("La base ya tiene datos. Para borrar todo y sembrar de nuevo: SEED_RESET=1 pnpm db:seed");
    return;
  }
  if (users > 0) {
    console.log("SEED_RESET=1: borrando datos…");
    await db.$transaction([
      db.stockMovement.deleteMany(), db.putbackTask.deleteMany(), db.pickTask.deleteMany(), db.waveOrder.deleteMany(), db.wave.deleteMany(),
      db.orderEvent.deleteMany(), db.orderLine.deleteMany(), db.order.deleteMany(), db.receptionLine.deleteMany(), db.reception.deleteMany(),
      db.stockLevel.deleteMany(), db.location.deleteMany(), db.warehouse.deleteMany(), db.product.deleteMany(), db.apiKey.deleteMany(),
      db.setting.deleteMany(), db.user.deleteMany(),
      db.$executeRaw`ALTER SEQUENCE "order_code_seq" RESTART`,
      db.$executeRaw`ALTER SEQUENCE "wave_code_seq" RESTART`,
      db.$executeRaw`ALTER SEQUENCE "reception_code_seq" RESTART`,
    ]);
  }

  const [adminHash, supHash, opHash] = await Promise.all([bcrypt.hash("admin1234", 10), bcrypt.hash("super1234", 10), bcrypt.hash("opera1234", 10)]);
  const admin = await db.user.create({ data: { email: "admin@vmanque.cl", name: "Administrador", role: "ADMIN", passwordHash: adminHash } });
  await db.user.createMany({
    data: [
      { email: "supervisor@vmanque.cl", name: "Sofía Supervisora", role: "SUPERVISOR", passwordHash: supHash },
      { email: "operador@vmanque.cl", name: "Pedro Operador", role: "OPERATOR", passwordHash: opHash },
    ],
  });
  await db.setting.create({ data: { key: "companyName", value: "VManque" } });

  const wh = await db.warehouse.create({ data: { code: "BC", name: "Bodega Central" } });

  // Zone A: picking (2 aisles × 6 racks × 3 levels). Zone B: reserve (1 aisle × 6 racks × 4 levels). One dock.
  const locs: { code: string; zone: string; aisle: number | null; rack: number | null; level: number | null; role: LocationRole; sortKey: number }[] = [];
  for (let a = 1; a <= 2; a++) for (let r = 1; r <= 6; r++) for (let l = 1; l <= 3; l++)
    locs.push({ code: locationCode("A", a, r, l), zone: "A", aisle: a, rack: r, level: l, role: "PICK", sortKey: locationSortKey("A", a, r, l) });
  for (let r = 1; r <= 6; r++) for (let l = 1; l <= 4; l++)
    locs.push({ code: locationCode("B", 1, r, l), zone: "B", aisle: 1, rack: r, level: l, role: "RESERVE", sortKey: locationSortKey("B", 1, r, l) });
  locs.push({ code: "ANDEN-1", zone: "DOCK", aisle: null, rack: null, level: null, role: "DOCK", sortKey: 0 });
  await db.location.createMany({ data: locs.map((l) => ({ ...l, warehouseId: wh.id })) });
  const locations = await db.location.findMany({ orderBy: { sortKey: "asc" } });
  const pickLocs = locations.filter((l) => l.role === "PICK");
  const reserveLocs = locations.filter((l) => l.role === "RESERVE");
  const dock = locations.find((l) => l.role === "DOCK")!;

  await db.product.createMany({
    data: PRODUCTS.map((name, i) => {
      const n = String(i + 1).padStart(4, "0");
      return { sku: `VM-${n}`, name, barcode: ean13(`780${String(1000000 + i * 37).padStart(9, "0")}`), imageUrl: `/products/photos/vm-${n}.jpg`, description: DESCRIPTIONS[i] };
    }),
  });
  const products = await db.product.findMany({ orderBy: { sku: "asc" } });

  const stock: { locationId: string; productId: string; qty: number; minQty?: number; maxQty?: number }[] = [];
  products.forEach((p, i) => {
    const withLimits = i % 2 === 0;
    // A few pick slots start under their minimum so the replenishment report has something to show.
    const qty = withLimits && i % 6 === 0 ? int(0, 3) : int(6, 24);
    stock.push({ locationId: pickLocs[i].id, productId: p.id, qty, ...(withLimits ? { minQty: 6, maxQty: 24 } : {}) });
    if (i < 5) stock.push({ locationId: pickLocs[30 + i].id, productId: p.id, qty: int(2, 8) });
    if (i < 22 && i !== 7) stock.push({ locationId: reserveLocs[i % reserveLocs.length].id, productId: p.id, qty: int(20, 60) });
  });
  for (const i of [3, 11, 19]) stock.push({ locationId: dock.id, productId: products[i].id, qty: 12 });
  await db.stockLevel.createMany({ data: stock });
  await db.stockMovement.createMany({
    data: stock.filter((s) => s.qty > 0).map((s) => ({ type: "RECEIPT" as const, productId: s.productId, toLocationId: s.locationId, qty: s.qty, reference: "INICIAL", userId: admin.id, note: "Stock inicial" })),
  });

  // Pending orders. Product 7 (no reserve, low shelf) is ordered a lot to show a shortage in the first wave.
  for (let n = 0; n < 15; n++) {
    const [{ nextval }] = await db.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('"order_code_seq"')`;
    const chosen = new Set<number>();
    const lineCount = int(1, 4);
    if (n === 0) chosen.add(7);
    while (chosen.size < lineCount) chosen.add(int(0, products.length - 1));
    const commune = pick(COMMUNES);
    await db.order.create({
      data: {
        code: `PED-${String(nextval).padStart(6, "0")}`,
        externalRef: `WEB-${10230 + n}`,
        source: "IMPORT",
        customerName: CUSTOMERS[n],
        address: `${pick(STREETS)} ${int(100, 4999)}${rand() > 0.6 ? `, depto ${int(101, 1802)}` : ""}`,
        commune,
        phone: `+569${int(10000000, 99999999)}`,
        carrier: pick(CARRIERS),
        priority: n < 2 ? 5 : 0,
        lines: { create: [...chosen].map((i) => ({ productId: products[i].id, qty: n === 0 && i === 7 ? 30 : int(1, 3) })) },
        events: { create: { toStatus: "PENDING", message: "Pedido creado (importación)", userId: admin.id } },
      },
    });
  }

  console.log("\nSemilla lista: 3 usuarios, 1 bodega, %d ubicaciones, %d productos, 15 pedidos pendientes.", locations.length, products.length);
  console.log("  admin@vmanque.cl / admin1234   (Administrador — cambia la contraseña)");
  console.log("  supervisor@vmanque.cl / super1234   (Supervisor)");
  console.log("  operador@vmanque.cl / opera1234   (Operador)\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
