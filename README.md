# VManque WMS

Sistema de gestión de bodega (WMS) para una pyme: stock por ubicación, picking por olas, mesa de separación, empaque con verificación y despacho. Tiene una interfaz de **oficina** (PC) y un **modo bodega** para el teléfono, pensado para lectores de código de barras (USB/Bluetooth) o la cámara.

Una sola aplicación Next.js 15 (App Router, server actions) con PostgreSQL vía Prisma 6. Sin integraciones externas: la impresión son páginas HTML con tamaño de etiqueta (`@page`) que se imprimen o guardan como PDF desde el navegador.

## Requisitos

- Node 22 y pnpm 10+
- PostgreSQL 16

## Puesta en marcha

```bash
cp .env.example .env          # DATABASE_URL y SESSION_SECRET (≥ 32 caracteres: openssl rand -base64 48)
pnpm install
pnpm db:migrate               # aplica las migraciones (en producción: pnpm db:deploy)
pnpm db:seed                  # datos de ejemplo
pnpm dev                      # http://localhost:3000
```

Usuarios de ejemplo (**cambia las contraseñas**, desde *Mi cuenta* o *Usuarios*):

| Correo | Contraseña | Rol |
|---|---|---|
| admin@vmanque.cl | admin1234 | Administrador |
| supervisor@vmanque.cl | super1234 | Supervisor |
| operador@vmanque.cl | opera1234 | Operador |

La semilla no hace nada si la base ya tiene usuarios. Para borrar todo y sembrar de nuevo: `SEED_RESET=1 pnpm db:seed`.

> La cámara del teléfono sólo funciona en HTTPS (o `localhost`). En la red local usa un lector Bluetooth o publica la app detrás de HTTPS.

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Desarrollo, compilación y producción |
| `pnpm typecheck` | TypeScript estricto |
| `pnpm lint` | ESLint (config de Next) |
| `pnpm test` | Vitest: lógica pura de asignación, ruta, mesa, stock, reposición e importación |
| `pnpm db:migrate` | `prisma migrate dev` (crea y aplica migraciones; nunca `db push`) |
| `pnpm db:deploy` | `prisma migrate deploy` |
| `pnpm db:seed` | Datos de ejemplo |

## Despliegue en Coolify

El repositorio incluye un `Dockerfile` de producción para Node 22. La aplicación expone el puerto `3000`, aplica las migraciones con `prisma migrate deploy` al iniciar y publica `GET /api/health`, que también verifica la conexión con PostgreSQL.

Configura estas variables en Coolify:

- `DATABASE_URL`: URL interna de PostgreSQL en la red de Coolify.
- `SESSION_SECRET`: secreto aleatorio de al menos 32 caracteres.

El primer despliegue no ejecuta la semilla automáticamente. Si se necesitan datos iniciales, ejecuta `pnpm db:seed` una sola vez desde la terminal del contenedor y cambia inmediatamente las contraseñas de ejemplo.

## Roles

- **Operador**: todo el modo bodega (picking, separar, empacar, despachar, recibir, ubicar, mover, contar, reponer, consultar) y consulta en la oficina.
- **Supervisor**: + pedidos (crear, importar, cancelar), olas, ajustes manuales, recepciones, ubicaciones y productos.
- **Administrador**: + usuarios, API keys y ajustes.

Los permisos se validan en el servidor en cada acción; la interfaz sólo oculta lo que no corresponde.

## Flujo de un pedido

`Pendiente → En ola → Recogido → Separado → Empacado → Despachado` (o `Cancelado`).

### Oficina (PC)

- **Inicio**: pedidos por etapa, olas en curso, alertas de reposición y productos por reponer, últimos movimientos.
- **Pedidos**: lista con filtros en la URL y paginación; pedido manual; importación Excel/CSV (`ref, customer, address, commune, phone, carrier, sku, qty`, una fila por línea, agrupadas por `ref`) con vista previa de errores antes de confirmar; detalle con avance por etapa, historial, cancelar y liberar de la ola.
- **Olas**: eliges pedidos pendientes → se crea la ola con una casilla de la mesa por pedido y las tareas de picking ordenadas por la ruta. Muestra faltantes, permite asignar operador, cancelar (si no se recogió nada), cerrar e imprimir la lista de picking.
- **Mesa de separación**: eliges una ola en mesa, escaneas cada unidad y la pantalla muestra en grande **CASILLA N** y el pedido. Avisa si ya está todo separado, si la unidad no figura como recogida o si no es de la ola.
- **Preparación**: escaneas el pedido (o ola + casilla) y luego cada producto; uno equivocado da un error visible y sonoro. Al completar queda Empacado y se abre la etiqueta de envío 100×150 mm (QR con el código del pedido).
- **Despacho**: escaneas las etiquetas de los bultos → Despachado. Lista de empacados por transporte y despachados del día.
- **Inventario**: stock por producto (estantería, andén, comprometido, en proceso, disponible), registro de movimientos con filtros, ajuste manual con motivo, traspaso, reporte de reposición y lista de unidades por reponer.
- **Ubicaciones**: lista por zona, generador en bloque (zona, pasillos, racks, niveles → `A-01-02-03`), ubicaciones sueltas (andén), uso picking/reserva/andén, mín/máx por casilla, etiquetas 100×50 mm con QR `LOC:<código>`.
- **Productos**: catálogo, alta/edición, importación Excel/CSV (`sku, name, barcode, image`), etiquetas QR con el SKU.
- **Recepciones**: borrador con líneas (producto, cantidad, ubicación destino; por defecto el andén) que al confirmar ingresa el stock.
- **Usuarios, API keys, Ajustes** (nombre de la empresa que sale en las etiquetas).

### Modo bodega (teléfono, `/m`)

Botones grandes, letra grande, una cosa por pantalla. Barra inferior: Inicio, Picking, Separar, Empacar, Consultar.

- **Picking**: tomas una ola; por cada parada ves la ubicación en grande → la escaneas → escaneas cada unidad (o escribes la cantidad). Al completar la parada se confirma sola. **Falta** registra lo que encontraste. Al terminar todas, la ola pasa a la mesa.
- **Separar / Empacar / Despachar**: las mismas pantallas de la oficina, en formato teléfono.
- **Recibir**: producto → cantidad → ubicación (entrada de mercadería).
- **Ubicar**: igual, pero desde el andén a su casilla.
- **Mover**: ubicación de origen → producto → cantidad → ubicación de destino.
- **Contar**: escaneas una ubicación, ingresas lo contado de cada producto (y escaneas lo que aparezca de más); las diferencias se registran como ajustes.
- **Reponer**: unidades de pedidos cancelados después del picking; eliges una y escaneas dónde la dejas.
- **Consultar**: escaneas lo que sea: una ubicación muestra su contenido; un producto, dónde está y su disponible.

Todos los campos de escaneo pasan por un único resolvedor: `LOC:<código>` o un código de ubicación → ubicación; SKU o código de barras → producto; `PED-…` → pedido.

## Reglas de stock

- El stock físico vive en las ubicaciones. Cada cambio pasa por una sola función (`src/server/inventory/stock.ts`) que actualiza el saldo de forma atómica (descuento con guarda `qty >= n`, incremento con upsert) y escribe el movimiento en la misma transacción. La base además impide saldos negativos (`CHECK qty >= 0`).
- **Disponible** = stock en ubicaciones de picking y reserva − **comprometido** (unidades sin recoger de pedidos Pendientes o En ola). El andén no cuenta como disponible hasta ubicarlo.
- **El pedido compromete, el picking descuenta del estante** (movimiento PICK). Lo recogido queda "en proceso" hasta despacharse; el despacho registra un movimiento SHIP sólo como historial.
- **Asignación de la ola**: por producto, primero ubicaciones de picking y después reserva, cada grupo en orden de ruta, nunca más que el saldo menos lo ya reservado por tareas abiertas de otras olas. Lo que no alcanza queda como faltante. Las tareas se ordenan por la ruta (pasillos en serpentina) para recorrer la bodega una vez.
- **Cancelar** antes del picking sólo libera el compromiso (y achica las tareas abiertas de la ola). Si ya había unidades recogidas, quedan en **Por reponer** y alguien las devuelve a una ubicación (movimiento RETURN).
- **Faltantes**: un pedido que no se completó en su ola puede **liberarse** para entrar en otra; lo ya recogido sigue con él.
- **Reposición**: casillas de picking bajo su mínimo con stock en reserva → movimiento sugerido hasta el máximo; al ejecutarlo es un traspaso.
- **Conteo**: compara contra lo que el operador vio; si el saldo cambió mientras contaba, se rechaza y pide recargar.

## API

`/api/v1` con API key (Bearer): crear pedidos (idempotente por `externalRef`), estado de un pedido y disponible por SKU. Ver [docs/API.md](docs/API.md).

## Estructura

```
prisma/                 schema, migraciones, seed
src/app/(auth)/login    ingreso
src/app/(app)/…         oficina (PC)
src/app/m/…             modo bodega (teléfono)
src/app/print/…         etiquetas y lista de picking
src/app/api/v1/…        API
src/components/ui/      primitivas (Button, Input, Card, Badge, Table, Dialog, ScanInput…)
src/features/<área>/    componentes, server actions y servicios por área
src/server/             db, auth, inventario, resolvedor de códigos, lógica pura (domain/*) con tests
```
