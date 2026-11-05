# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Operadores de bodega** en el teléfono (`/m`): picking por olas, separar, empacar, despachar, recibir, ubicar, mover, contar, reponer y consultar escaneando códigos.
- **Supervisores y administradores** en el PC (oficina): pedidos, olas, mesa de separación, preparación, despacho, inventario, ubicaciones, productos, recepciones, usuarios, API keys y ajustes.
- Ambas interfaces pesan lo mismo en el uso diario.

## Product Purpose

Sistema de gestión de bodega (WMS) para una pyme: stock por ubicación, picking por olas, mesa de separación, empaque con verificación y despacho. Es un proyecto de título: no está en producción, pero debe ser funcional de punta a punta y cubrir la mayor cantidad de casos reales posible.

## Operating Context

- Escaneo con la cámara del teléfono (requiere HTTPS o `localhost`) y con lectores de código de barras USB/Bluetooth que escriben el código y envían Enter. Ambos deben funcionar en todos los campos de escaneo.
- Un único resolvedor de códigos: `LOC:<código>` o código de ubicación → ubicación; SKU o código de barras → producto; `PED-…` → pedido.
- Impresión desde el navegador: etiquetas de envío 100×150 mm, etiquetas de ubicación 100×50 mm con QR, etiquetas de producto y lista de picking.
- Roles: Operador, Supervisor y Administrador, validados en el servidor.
- Siguiente etapa prevista (no implementada): un Arduino que encienda un LED en la ubicación donde está el producto (pick-to-light).

## Capabilities and Constraints

- Next.js 15 (App Router, server actions), PostgreSQL vía Prisma 6, Tailwind 4, lucide-react, sonner, next-themes, zxing para la cámara.
- Interfaz en español de Chile (`es-CL`).
- Reglas de stock y flujo de pedidos descritos en README.md: `Pendiente → En ola → Recogido → Separado → Empacado → Despachado` (o `Cancelado`).
- Tema claro y oscuro.

## Brand Commitments

- Nombre: VManque WMS. Empresa configurable en Ajustes (sale en las etiquetas).
- Sin logo ni assets de marca adicionales.

## Evidence on Hand

- Datos de ejemplo de la semilla (`prisma/seed.ts`): 3 usuarios, 1 bodega, 61 ubicaciones, 30 productos, 15 pedidos.
- No hay clientes, testimonios ni métricas reales; no inventarlos.

## Product Principles

1. Cada pantalla de bodega hace una sola cosa y dice qué escanear a continuación.
2. El resultado de cada escaneo se entiende de un vistazo: acierto, error y qué se esperaba.
3. La oficina prioriza ver el estado de la bodega y actuar en pocos clics.
4. Funcional antes que decorativo: cubrir casos reales (faltantes, cancelaciones, conteos, reposición).
