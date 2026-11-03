# API v1

Base: `https://<tu-servidor>/api/v1`. Todas las respuestas son JSON.

## Autenticación

Crea una key en **Administración → API keys** (sólo administradores). Se muestra una sola vez; en la base sólo queda su huella sha256.

```
Authorization: Bearer vmk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Sin key, key inválida o revocada → `401 {"error": "API key inválida o revocada"}`.

## Errores

| Código | Cuándo |
|---|---|
| 400 | Cuerpo que no es JSON, parámetros faltantes |
| 401 | API key ausente, inválida o revocada |
| 404 | Pedido no encontrado |
| 422 | Validación (`details` trae `path` y `message` por campo) o SKU inexistente |
| 500 | Error inesperado |

## POST /orders — crear pedido

Idempotente por `externalRef`: si ya existe un pedido con esa referencia, responde `200` con el existente (`created: false`) y no crea otro. Un pedido nuevo responde `201`. Las líneas con el mismo SKU se suman.

| Campo | Tipo | |
|---|---|---|
| `externalRef` | string ≤ 80 | Recomendado (id del pedido en tu sistema) |
| `customerName` | string | Obligatorio |
| `address` | string | Obligatorio |
| `commune` | string | Obligatorio |
| `phone`, `carrier`, `notes` | string | Opcionales |
| `priority` | entero 0–9 | Opcional, 0 por defecto |
| `lines` | `[{ sku, qty }]` | 1–500 líneas, `qty` entero ≥ 1 |

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $VM_KEY" -H "Content-Type: application/json" \
  -d '{
    "externalRef": "WEB-20001",
    "customerName": "Camila Rojas",
    "address": "Av. Irarrázaval 1234, depto 501",
    "commune": "Ñuñoa",
    "phone": "+56912345678",
    "carrier": "Starken",
    "lines": [{ "sku": "VM-0001", "qty": 2 }, { "sku": "VM-0004", "qty": 1 }]
  }'
# 201 {"code":"PED-000016","created":true}
# repetido → 200 {"code":"PED-000016","created":false}
```

## GET /orders/:code — estado y avance

`:code` puede ser el código interno (`PED-000016`) o tu `externalRef`.

```bash
curl -H "Authorization: Bearer $VM_KEY" http://localhost:3000/api/v1/orders/WEB-20001
```

```json
{
  "code": "PED-000016", "externalRef": "WEB-20001", "status": "PENDING", "carrier": "Starken",
  "createdAt": "…", "pickedAt": null, "sortedAt": null, "packedAt": null, "shippedAt": null, "cancelledAt": null,
  "progress": { "units": 3, "picked": 0, "sorted": 0, "packed": 0 },
  "lines": [{ "sku": "VM-0001", "qty": 2, "picked": 0, "sorted": 0, "packed": 0 }]
}
```

`status`: `PENDING`, `IN_WAVE`, `PICKED`, `SORTED`, `PACKED`, `SHIPPED`, `CANCELLED`.

## GET /stock?sku= — disponible por SKU

Uno o varios SKU (`?sku=A&sku=B` o `?sku=A,B`, máximo 200).

```bash
curl -H "Authorization: Bearer $VM_KEY" "http://localhost:3000/api/v1/stock?sku=VM-0001,VM-0002,NO-EXISTE"
```

```json
{ "items": [
  { "sku": "VM-0001", "found": true, "available": 55, "onShelf": 64, "committed": 9, "inProcess": 0, "dock": 0 },
  { "sku": "NO-EXISTE", "found": false }
] }
```

`available` = `onShelf` (picking + reserva) − `committed` (pedidos pendientes o en ola aún sin recoger), nunca negativo en la respuesta. `inProcess` son unidades ya recogidas que todavía no se despachan. `dock` es lo recibido en andén que aún no se ubica (no cuenta como disponible).
