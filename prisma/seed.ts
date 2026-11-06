/* Demo data. Refuses to run on a database that already has users unless SEED_RESET=1. */
import { Prisma, PrismaClient, type LocationRole, type SalesChannel } from "@prisma/client";
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

// Sale prices in CLP, same order as PRODUCTS.
const PRICES = [
  24990, 18990, 12990, 6490, 3990, 2990, 8990, 4590, 3490, 2190,
  2490, 1990, 9990, 4490, 7990, 2990, 6990, 12990, 39990, 54990,
  21990, 8990, 15990, 17990, 19990, 29990, 11990, 5990, 7490, 8990,
];

// Store mix for the sales history (weights) and the commission each one charges (demo estimate, see src/lib/channels.ts).
const CHANNEL_MIX: [SalesChannel, number][] = [["MERCADOLIBRE", 0.4], ["FALABELLA", 0.24], ["PARIS", 0.2], ["DIRECT", 0.16]];
const RATE: Record<SalesChannel, number> = { MERCADOLIBRE: 0.15, FALABELLA: 0.14, PARIS: 0.12, DIRECT: 0.03 };
const PREFIX: Record<SalesChannel, string> = { MERCADOLIBRE: "MLC", FALABELLA: "FAL", PARIS: "PAR", DIRECT: "WEB" };
const STORE: Record<SalesChannel, string> = { MERCADOLIBRE: "Mercado Libre", FALABELLA: "Falabella", PARIS: "Paris", DIRECT: "la tienda propia" };
const FIRST = ["Camila", "Benjamín", "Valentina", "Matías", "Antonia", "Joaquín", "Isidora", "Tomás", "Florencia", "Vicente", "Martina", "Agustín", "Catalina", "Maximiliano", "Josefa", "Diego", "Sofía", "Lucas", "Emilia", "Cristóbal", "Fernanda", "Ignacio", "Javiera", "Felipe"];
const LAST = ["Rojas", "Soto", "Muñoz", "González", "Díaz", "Pérez", "Contreras", "Silva", "Morales", "Araya", "Fuentes", "Castillo", "Espinoza", "Tapia", "Reyes", "Vargas", "Sepúlveda", "Navarro", "Carrasco", "Torres"];
// Month factor (Jan..Dec): CyberDay in June, Black Friday / CyberMonday in November, Christmas in December.
const SEASON = [0.85, 0.75, 0.9, 0.95, 1.0, 1.45, 1.0, 1.0, 1.1, 1.05, 1.5, 1.8];

function pickChannel(growth: number): SalesChannel {
  // Mercado Libre gains share over time.
  const w = CHANNEL_MIX.map(([c, x]) => [c, c === "MERCADOLIBRE" ? x * (0.85 + growth * 0.3) : x] as const);
  let r = rand() * w.reduce((n, [, x]) => n + x, 0);
  for (const [c, x] of w) if ((r -= x) <= 0) return c;
  return "DIRECT";
}

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
      return { sku: `VM-${n}`, name, barcode: ean13(`780${String(1000000 + i * 37).padStart(9, "0")}`), imageUrl: `/products/photos/vm-${n}.jpg`, description: DESCRIPTIONS[i], price: PRICES[i] };
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
    if (i < 22 && i !== 11) stock.push({ locationId: reserveLocs[i % reserveLocs.length].id, productId: p.id, qty: int(20, 60) });
  });
  for (const i of [3, 11, 19]) stock.push({ locationId: dock.id, productId: products[i].id, qty: 12 });
  await db.stockLevel.createMany({ data: stock });
  await db.stockMovement.createMany({
    data: stock.filter((s) => s.qty > 0).map((s) => ({ type: "RECEIPT" as const, productId: s.productId, toLocationId: s.locationId, qty: s.qty, reference: "INICIAL", userId: admin.id, note: "Stock inicial" })),
  });

  // Sales history: every store, from January last year until now, already shipped (or cancelled).
  // It feeds the revenue monitor and does not touch stock (those units left before this demo started).
  const now = new Date();
  const start = new Date(now.getFullYear() - 1, 0, 1);
  const days = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  const orders: Prisma.OrderCreateManyInput[] = [];
  const lines: Prisma.OrderLineCreateManyInput[] = [];
  const events: Prisma.OrderEventCreateManyInput[] = [];
  let seq = 0;
  for (let d = 0; d <= days; d++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
    const growth = d / days;
    const dow = day.getDay();
    const week = dow === 0 || dow === 6 ? 1.25 : dow === 1 ? 1.1 : 1;
    const isToday = day.toDateString() === now.toDateString();
    const open = isToday ? Math.max(0, now.getHours() - 8) : 15; // sales between 08:00 and 23:00
    let count = Math.round((6 + growth * 4) * SEASON[day.getMonth()] * week * (0.7 + rand() * 0.6) * (open / 15));
    if (day.getMonth() === 10 && day.getDate() >= 24) count *= 2; // Black Friday / CyberMonday
    if (isToday) count = Math.max(0, count - 15); // the 15 pending orders below are today's too
    for (let k = 0; k < count; k++) {
      seq++;
      const id = `hist${seq}`;
      const channel = pickChannel(growth);
      const created = new Date(day.getTime() + (8 * 60 + int(0, open * 60 - 1)) * 60_000);
      const chosen = new Set<number>();
      const n = rand() < 0.65 ? 1 : int(2, 3);
      while (chosen.size < n) chosen.add(int(0, products.length - 1));
      let subtotal = 0;
      for (const i of chosen) {
        const qty = rand() < 0.8 ? 1 : 2;
        // Marketplaces run promotions: some sales go out with a discount.
        const unitPrice = channel !== "DIRECT" && rand() < 0.25 ? Math.round((products[i].price * 0.9) / 10) * 10 : products[i].price;
        subtotal += qty * unitPrice;
        lines.push({ orderId: id, productId: products[i].id, qty, unitPrice, pickedQty: qty, sortedQty: qty, packedQty: qty });
      }
      const shippingFee = channel === "DIRECT" ? pick([0, 3990, 3990, 4990]) : 0;
      const cancelled = rand() < 0.03;
      const doneAt = new Date(Math.min(now.getTime() - 60_000, created.getTime() + int(1, 26) * 3_600_000));
      orders.push({
        id,
        code: `PED-${String(seq).padStart(6, "0")}`,
        externalRef: `${PREFIX[channel]}-${channel === "MERCADOLIBRE" ? 2000000000 + seq * 7 : 100000 + seq}`,
        source: "API",
        channel,
        customerName: `${pick(FIRST)} ${pick(LAST)}`,
        address: `${pick(STREETS)} ${int(100, 4999)}`,
        commune: pick(COMMUNES),
        carrier: channel === "DIRECT" ? pick(CARRIERS) : pick(["Starken", "Chilexpress", "Blue Express"]),
        status: cancelled ? "CANCELLED" : "SHIPPED",
        total: subtotal + shippingFee,
        shippingFee,
        commission: Math.round(subtotal * RATE[channel]),
        createdAt: created,
        ...(cancelled ? { cancelledAt: doneAt } : { pickedAt: doneAt, sortedAt: doneAt, packedAt: doneAt, shippedAt: doneAt }),
      });
      events.push({ orderId: id, toStatus: "PENDING", message: `Pedido recibido desde ${STORE[channel]}`, createdAt: created });
      events.push(cancelled ? { orderId: id, fromStatus: "PENDING", toStatus: "CANCELLED", message: "Cancelado por el comprador", createdAt: doneAt } : { orderId: id, fromStatus: "PACKED", toStatus: "SHIPPED", message: "Despachado", createdAt: doneAt });
    }
  }
  for (let i = 0; i < orders.length; i += 2000) await db.order.createMany({ data: orders.slice(i, i + 2000) });
  for (let i = 0; i < lines.length; i += 4000) await db.orderLine.createMany({ data: lines.slice(i, i + 4000) });
  for (let i = 0; i < events.length; i += 4000) await db.orderEvent.createMany({ data: events.slice(i, i + 4000) });
  await db.$executeRawUnsafe(`SELECT setval('"order_code_seq"', ${seq})`);

  // Pending orders. Product 11 (boldo tea: no reserve, cheap) is ordered a lot to show a shortage in the first wave.
  for (let n = 0; n < 15; n++) {
    const [{ nextval }] = await db.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('"order_code_seq"')`;
    const chosen = new Set<number>();
    const lineCount = int(1, 2);
    if (n === 0) chosen.add(11);
    while (chosen.size < lineCount) chosen.add(int(0, products.length - 1));
    const commune = pick(COMMUNES);
    const channel = (["MERCADOLIBRE", "FALABELLA", "MERCADOLIBRE", "PARIS", "DIRECT"] as const)[n % 5];
    const items = [...chosen].map((i) => ({ productId: products[i].id, qty: n === 0 && i === 11 ? 30 : rand() < 0.8 ? 1 : 2, unitPrice: products[i].price }));
    const subtotal = items.reduce((t, l) => t + l.qty * l.unitPrice, 0);
    const shippingFee = channel === "DIRECT" ? 3990 : 0;
    await db.order.create({
      data: {
        code: `PED-${String(nextval).padStart(6, "0")}`,
        externalRef: `${PREFIX[channel]}-${channel === "MERCADOLIBRE" ? 2100000000 + n * 13 : 200000 + n}`,
        source: "API",
        channel,
        total: subtotal + shippingFee,
        shippingFee,
        commission: Math.round(subtotal * RATE[channel]),
        createdAt: new Date(now.getTime() - (15 - n) * 7 * 60_000),
        customerName: CUSTOMERS[n],
        address: `${pick(STREETS)} ${int(100, 4999)}${rand() > 0.6 ? `, depto ${int(101, 1802)}` : ""}`,
        commune,
        phone: `+569${int(10000000, 99999999)}`,
        carrier: pick(CARRIERS),
        priority: n < 2 ? 5 : 0,
        lines: { create: items },
        events: { create: { toStatus: "PENDING", message: `Pedido recibido desde ${STORE[channel]}` } },
      },
    });
  }

  console.log("\nSemilla lista: 3 usuarios, 1 bodega, %d ubicaciones, %d productos, %d ventas históricas y 15 pedidos pendientes.", locations.length, products.length, seq);
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
