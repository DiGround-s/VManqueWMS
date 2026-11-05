---
version: 1
slug: "src-app-app-layout-tsx"
primary_target: "src/app/(app)/layout.tsx"
related_targets: ["src/app/m/layout.tsx","src/app/(auth)/login/page.tsx"]
---

## Scope

Toda la aplicación: oficina (PC, `src/app/(app)`), modo bodega del teléfono (`src/app/m`) e ingreso (`src/app/(auth)/login`). Modo: Operate. La impresión (`src/app/print`) queda fuera.

## Audience and job

Supervisores en PC gestionan pedidos, olas e inventario; operadores en el teléfono escanean ubicaciones y productos con cámara o lector. Ambos pesan lo mismo. Proyecto de título: funcional de punta a punta.

## Direction contract

THESIS: La bodega como sala de correos: cada cosa tiene su casillero y cada escaneo queda matasellado. Rechaza el panel SaaS gris con tarjetas de métricas y el oscuro industrial con franjas de peligro.

OWN-WORLD: Fondo papel de sobre cálido claro (y su versión nocturna azul tinta), riel lateral azul postal, rojo matasellos para errores y alertas, amarillo saca de correo para "atención", verde timbre para confirmado. Overpass (letrero vial) para UI, Overpass Mono para códigos. Bordes de casillero de 2 px, radios de 6–10 px, sin sombras difusas.

STORY: El usuario ve de un vistazo cuántos pedidos hay en cada casillero del flujo, qué necesita atención y qué escanear a continuación; cada escaneo responde con un timbre claro de acierto o error.

FIRST VIEWPORT: Oficina: riel azul a la izquierda con grupos de navegación; arriba, saludo con fecha y un campo de escaneo global con cámara; debajo, la fila de casilleros del flujo de pedidos (Pendiente → Despachados hoy) con número grande y barra de proporción; franja de atención con sello; dos tarjetas: olas en curso y movimientos con hora en matasellos. Teléfono: barra superior azul, título de la tarea, código de ubicación a escala de muestrario y el campo de escaneo grande como acción principal; barra inferior de pestañas.

FORM: Sala de correos (candidato 7 de 7 de la lista propia, asignado por la tirada). seed:9111bb7d8445b7d7. Firma: el matasellos de confirmación tras cada escaneo correcto y la fila de casilleros del flujo. Raises: códigos a escala de muestrario (de Muestrario tipográfico); cantidades como barras de largo exacto (de Partitura de movimiento); estados como marcas impresas consistentes, hecho = tachado (de Página con riel central); capacidad mín/máx como medidor (de Carátula de casete).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
