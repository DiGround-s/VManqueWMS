---
name: VManque WMS
description: Gestión de bodega como sala de correos — cada cosa en su casillero, cada escaneo matasellado.
colors:
  envelope-paper: "#f3efe4"
  letter-sheet: "#fffdf8"
  folded-sheet: "#f7f2e6"
  pigeonhole-line: "#ddd3bd"
  pigeonhole-line-strong: "#b3a68a"
  postal-ink: "#1b2333"
  pencil-gray: "#5a6273"
  postal-blue: "#1f3b6d"
  postal-blue-soft: "#e2e9f5"
  postal-blue-ink: "#ffffff"
  rail-blue: "#1f3b6d"
  rail-blue-raised: "#2a4a82"
  rail-mist: "#b5c3de"
  stamp-green: "#2f7d4f"
  stamp-green-wash: "#dcefe2"
  postmark-red: "#c7372f"
  postmark-red-wash: "#fbe3df"
  mailbag-amber: "#8a5a00"
  mailbag-amber-wash: "#fbecc6"
  mailbag-yellow: "#e2b33c"
typography:
  display:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1.4
  body:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "\"tnum\""
  label:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.06em"
  numeral:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
  specimen-code:
    fontFamily: "Overpass Mono, ui-monospace, monospace"
    fontSize: "clamp(2.75rem, 14vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  code:
    fontFamily: "Overpass Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
rounded:
  sm: "4px"
  md: "7px"
  lg: "10px"
  xl: "12px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.postal-blue}"
    textColor: "{colors.postal-blue-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.letter-sheet}"
    textColor: "{colors.postal-ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.folded-sheet}"
  button-danger:
    backgroundColor: "{colors.letter-sheet}"
    textColor: "{colors.postmark-red}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-danger-hover:
    backgroundColor: "{colors.postmark-red}"
    textColor: "{colors.postal-blue-ink}"
  button-ghost-hover:
    backgroundColor: "{colors.folded-sheet}"
    textColor: "{colors.postal-ink}"
  button-xl:
    rounded: "{rounded.lg}"
    padding: "0 20px"
    height: "56px"
    width: "100%"
  badge-neutral:
    backgroundColor: "{colors.folded-sheet}"
    textColor: "{colors.pencil-gray}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-success:
    backgroundColor: "{colors.stamp-green-wash}"
    textColor: "{colors.stamp-green}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-danger:
    backgroundColor: "{colors.postmark-red-wash}"
    textColor: "{colors.postmark-red}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-warn:
    backgroundColor: "{colors.mailbag-amber-wash}"
    textColor: "{colors.mailbag-amber}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  input:
    backgroundColor: "{colors.letter-sheet}"
    textColor: "{colors.postal-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  scan-input:
    backgroundColor: "{colors.letter-sheet}"
    textColor: "{colors.postal-ink}"
    typography: "{typography.code}"
    rounded: "{rounded.lg}"
    padding: "0 40px"
    height: "44px"
  scan-input-xl:
    backgroundColor: "{colors.letter-sheet}"
    textColor: "{colors.postal-ink}"
    rounded: "{rounded.lg}"
    padding: "0 48px"
    height: "64px"
  card:
    backgroundColor: "{colors.letter-sheet}"
    rounded: "{rounded.lg}"
  rack:
    backgroundColor: "{colors.letter-sheet}"
    rounded: "{rounded.lg}"
  pigeonhole:
    textColor: "{colors.postal-ink}"
    typography: "{typography.numeral}"
    padding: "16px"
  nav-item:
    textColor: "{colors.rail-mist}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-item-active:
    backgroundColor: "{colors.envelope-paper}"
    textColor: "{colors.postal-blue}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  phone-tab-active:
    backgroundColor: "{colors.postal-blue}"
    textColor: "{colors.postal-blue-ink}"
    rounded: "{rounded.lg}"
    height: "64px"
  slot-row:
    backgroundColor: "{colors.letter-sheet}"
    rounded: "{rounded.xl}"
    padding: "10px 14px"
  postmark:
    textColor: "{colors.stamp-green}"
    rounded: "{rounded.full}"
    size: "96px"
---

# Design System: VManque WMS

## Overview

**Creative North Star: "La sala de correos"**

La bodega se dibuja como una sala de correos: papel de sobre cálido de fondo, un riel lateral azul postal, casilleros enmarcados con líneas de 2 px y un matasellos redondo que cae sobre cada escaneo. Los números y códigos son protagonistas: los conteos se leen en grande, los códigos de ubicación se muestran a escala de muestrario en el teléfono y todo lo que se escanea está en Overpass Mono. La densidad es la de una herramienta de trabajo: la oficina muestra tablas y la fila de casilleros del flujo de pedidos; el teléfono muestra una sola tarea a la vez, con objetivos táctiles grandes.

El sistema rechaza el panel SaaS gris con tarjetas de métricas y el oscuro industrial con franjas de peligro. El modo oscuro no es negro industrial sino azul tinta nocturno (`#0e1525`), con el papel convertido en texto (`#ede8dc`). El color es semántico y escaso: azul para estructura y acción, rojo matasellos para error y alerta, verde timbre para confirmado, amarillo saca de correo para foco y marca sobre el riel.

**Key Characteristics:**
- Papel de sobre cálido + riel azul postal; modo nocturno azul tinta.
- Casilleros: marcos de 2 px, sin sombras difusas, profundidad por tono (hoja sobre papel).
- Matasellos redondo y rotado (−10°/−12°) como firma de confirmación, conteo y hora.
- Códigos y cantidades en Overpass Mono, cifras tabulares en toda la app.
- Cantidades como barras de largo exacto; capacidad mín/máx como medidor; paso hecho = tachado verde.

## Colors

Una paleta de oficina de correos: papeles cálidos, un azul postal estructural y tres tintas de timbre con significado fijo. Los valores del frontmatter son los del tema claro; el tema oscuro redefine las mismas variables bajo `.dark` (ver `.impeccable/design.json`, campo `dark` de cada color).

### Primary
- **Azul postal** (`postal-blue`): acción primaria, marco del rack de casilleros, campo y botón de escaneo, pestaña activa del teléfono, barra de progreso actual, avatar. En claro coincide con el riel; en oscuro se aclara a `#8fb0f5` para leerse sobre tinta.
- **Azul postal suave** (`postal-blue-soft`): fondo de la tarjeta "Ve a la ubicación" y de resultados de ubicación; badge de tono `accent` e `info`.

### Secondary
- **Riel azul** (`rail-blue`, `rail-blue-raised`, `rail-mist`): el riel lateral de oficina, la barra superior del teléfono y el panel izquierdo del ingreso. `rail-blue-raised` es el hover de los enlaces del riel; `rail-mist` es el texto secundario y los íconos inactivos sobre el riel.

### Tertiary
- **Rojo matasellos** (`postmark-red`, `postmark-red-wash`): errores de escaneo, alertas, el casillero "Pendiente" con pedidos sin ola, el botón "Falta", la franja de atención.
- **Verde timbre** (`stamp-green`, `stamp-green-wash`): confirmado. Matasellos "Escaneado", hora de cada movimiento, paradas y pasos terminados, "Disponible".
- **Amarillo saca de correo** (`mailbag-yellow`): anillo de foco global (`outline 2px`, offset 2 px), punto del wordmark, hover del enlace "Modo bodega", marco del lector de cámara, flechas del flujo en el ingreso.
- **Ámbar saca** (`mailbag-amber`, `mailbag-amber-wash`): badge `warn` y fondo de la franja de atención; también es el color de selección de texto en claro.

### Neutral
- **Papel de sobre** (`envelope-paper`): fondo de página y de la cabecera pegajosa (al 90 % con desenfoque).
- **Hoja de carta** (`letter-sheet`): superficie de tarjetas, racks, inputs, filas de tareas y diálogos.
- **Hoja doblada** (`folded-sheet`): hover de filas y botones secundarios, cabecera de tabla, skeleton, resumen de paso.
- **Línea de casillero** (`pigeonhole-line`) y **línea fuerte** (`pigeonhole-line-strong`): bordes de tarjetas, inputs y divisores; la fuerte marca botones secundarios, diálogos, estados vacíos punteados y la barra de desplazamiento.
- **Tinta postal** (`postal-ink`): texto principal y trazo de las ilustraciones de producto.
- **Gris lápiz** (`pencil-gray`): texto secundario, etiquetas `.label`, pestañas inactivas.

### Named Rules
**The Semáforo de Timbres Rule.** Rojo es error o alerta, verde es confirmado, azul es estructura o acción; ninguno se usa como decoración. Si un elemento rojo no pide atención, está mal.

**The Amarillo Sobre Azul Rule.** El amarillo saca de correo se usa como texto o trazo sólo sobre el riel azul (o sobre video, en el lector de cámara); sobre papel aparece únicamente como anillo de foco. No hay texto amarillo sobre papel claro.

## Typography

**Display Font:** Overpass (con ui-sans-serif, system-ui)
**Body Font:** Overpass
**Label/Mono Font:** Overpass Mono (con ui-monospace)

**Character:** Overpass es la letra de señalética vial: legible a distancia, firme en negrita 900, ideal para un número que se lee de pie con el teléfono en la mano. Overpass Mono marca todo lo que es código: SKU, ubicación, ola, pedido, cantidad, hora.

### Hierarchy
- **Display** (900, 3rem en `sm+` / 2.25rem móvil, interlínea 1.05, tracking −0.025em): sólo el titular del ingreso ("Cada cosa en su casillero.").
- **Headline** (900, 1.875rem, tracking −0.025em): título de página en oficina (`PageHeader`) y en teléfono (`PhoneTitle`, "Hola, …").
- **Title** (800, 15px): cabeceras de tarjeta; 1.125rem/800 en diálogos; 1.125rem/900 en filas de tarea del teléfono.
- **Body** (400, 14px; descripciones a 15px, máx. 65ch): tablas, formularios, texto corrido. Cifras tabulares globales (`font-variant-numeric: tabular-nums`).
- **Label** (700, 0.75rem, tracking 0.06em, MAYÚSCULAS, gris lápiz): cabeceras de tabla y rótulo de cada casillero/medida. Los grupos del riel usan la misma idea a 11px, tracking 0.08em.
- **Numeral** (900, 2.25rem, interlínea 1): el conteo de cada casillero del rack.
- **Specimen code** (Overpass Mono 700, `clamp(2.5–2.75rem, 13–14vw, 4–4.5rem)`, interlínea 1): el código de ubicación al que ir o que se escaneó, en el teléfono.
- **Code** (Overpass Mono 600, 14px): SKU, ubicaciones y cantidades en tablas; cantidades grandes de teléfono a 1.875–3.75rem/700.

### Named Rules
**The Muestrario Rule.** En el teléfono, el código que hay que ir a buscar se muestra a escala de muestrario (≥ 2.5rem mono 700) y es lo más grande de la pantalla.

**The Lo-Escaneable-Es-Mono Rule.** Todo valor que se escanea, se cuenta o se imprime en una etiqueta va en Overpass Mono; los nombres y las instrucciones van en Overpass. El campo de escaneo escribe en mono y su placeholder en sans.

## Layout

**Oficina (`lg+`):** grilla de dos columnas `248px | 1fr`. El riel es pegajoso a toda la altura (`h-dvh`) con grupos de navegación (General, Salidas, Bodega, Administración) y el acceso "Modo bodega" al pie. La cabecera pegajosa lleva el escaneo global (máx. 28rem) a la izquierda y la cuenta, tema y salida a la derecha. El contenido se centra a máx. 1400px con 32px de margen lateral y 32px vertical. Bajo `lg` el riel se vuelve una franja superior con navegación horizontal desplazable.

**Inicio de oficina:** cabecera con fecha → rack de 6 casilleros (en columna bajo `md`) → franja de atención → dos tarjetas en proporción 5:7 desde `xl`.

**Teléfono (`/m`):** barra superior azul de 56px, columna centrada de máx. 32rem con 16px de margen, barra inferior fija de 5 pestañas de 64px con respeto del área segura; el contenido reserva 112px abajo. Una tarea por pantalla, apilada en vertical con 16–24px entre bloques.

**Ingreso:** dos paneles 5:6 desde `lg` (riel azul con titular y flujo de etapas | formulario de máx. 24rem).

**Ritmo:** base de 4px. Entre secciones 24px; dentro de tarjetas 16px horizontal × 12px vertical en cabeceras, 16 × 10px en celdas; gap de botones 8px.

## Elevation & Depth

Sistema plano. La profundidad se logra con tono (hoja de carta `letter-sheet` sobre papel `envelope-paper`) y con marcos, no con sombras. Las únicas transparencias son la cabecera de oficina y la barra inferior del teléfono (papel al 90–95 % con `backdrop-blur`), para que el contenido pase por debajo sin perder lectura.

### Shadow Vocabulary
- **Canto de botón** (`box-shadow: 0 1px 0 rgb(0 0 0 / 0.12)`): sólo el botón primario, un canto duro de 1px como el borde de un timbre.
- **Máscara de lector** (`box-shadow: 0 0 0 200vmax rgb(0 0 0 / 0.45)`): oscurece el video fuera del marco de escaneo; no es elevación.

### Named Rules
**The Casillero Plano Rule.** Nada flota sobre sombra difusa. Si algo necesita separarse, recibe un marco de 2px o un tono de superficie distinto.

## Shapes

Esquinas suavemente curvas y marcos gruesos de casillero. Radios: 4px (`sm`) en badges y botones chicos, 7px (`md`) en botones, inputs y enlaces del riel, 10px (`lg`) en tarjetas, racks y campo de escaneo, 12px (`xl`) en las filas y tarjetas del teléfono y en el diálogo centrado. El contrato de dirección pedía 6–10px; el teléfono y el diálogo usan 12px y los badges 4px, y así queda registrado.

Bordes: 2px en lo que es casillero o se toca (botones, inputs, rack, filas de tareas del teléfono, diálogo, campo de escaneo); 1.5px en tarjetas y en sus divisores internos; 1px en celdas de tabla y badges. Los estados vacíos y las miniaturas sin imagen usan marco punteado de 2px. Las barras de proporción y progreso son píldoras (`rounded-full`).

**The Timbre Redondo Rule.** El círculo con borde de 2.5px en `currentColor` es exclusivo del matasellos. Siempre va rotado entre −10° y −12°, en mono 700, y su color dice el resultado.

Las ilustraciones de producto (`public/products/vm-XXXX.svg`, generadas por `scripts/product-images.mjs`) son dibujos planos a dos tintas con trazo de 5px en tinta postal, sobre una baldosa tintada de radio 24/200 y una sombra elíptica al 12 %.

## Components

### Buttons
Firmes y táctiles: marco de 2px y peso 700 en todas las variantes.
- **Shape:** 4px (`sm`, 32px de alto), 7px (`md` 40px, `lg` 48px), 10px (`xl`, mín. 56px, ancho completo, para el teléfono).
- **Primary:** azul postal con texto blanco y canto de 1px. Hover: `brightness(1.1)`; activo: `brightness(0.95)`.
- **Secondary:** hoja de carta con marco `pigeonhole-line-strong`; hover a hoja doblada.
- **Danger:** contorno rojo al 60 % sobre hoja; hover se llena de rojo con texto blanco.
- **Success:** verde timbre lleno con texto blanco (en oscuro, texto `surface`).
- **Ghost:** sin marco; hover a hoja doblada.
- **Estados:** deshabilitado al 45 % de opacidad; `pending` muestra un spinner de 16px y bloquea. Transición de 150ms sobre fondo, borde, color y filtro.

### Chips (Badges)
- **Style:** fondo lavado del tono, texto del tono, borde 1px del tono al 40 %, radio 4px, 12px/700, sin salto de línea.
- **State:** seis tonos (`neutral`, `accent`, `success`, `danger`, `info`, `warn`) asignados por el mapa de estados de `src/lib/labels`; nunca se elige el tono a mano.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** hoja de carta.
- **Shadow Strategy:** ninguna (ver Casillero Plano).
- **Border:** 1.5px `pigeonhole-line`; cabecera separada por 1.5px.
- **Internal Padding:** cabecera 16 × 12px con título 15px/800 y acción de texto azul a la derecha.

### Inputs / Fields
- **Style:** marco 2px `pigeonhole-line`, hoja de carta, radio 7px, alto 40px, 14px.
- **Focus:** el marco pasa a azul postal (sin anillo extra); hover a línea fuerte.
- **Error / Disabled:** deshabilitado al 60 %. Rótulo de campo 13px/700 encima, ayuda 12px gris debajo.

### Navigation
- **Riel de oficina:** enlaces 15px/600 en papel al 85 % con ícono de 18px en `rail-mist`; hover `rail-blue-raised`. Activo: fondo papel, texto e ícono azul postal, peso 800 (en oscuro: fondo `rail-blue-raised`, ícono amarillo). Títulos de grupo en mayúsculas 11px.
- **Barra inferior del teléfono:** 5 pestañas de 64px, ícono 24px sobre rótulo 12px/700. Activa: azul postal lleno, radio 10px; inactiva gris lápiz.

### Campo de escaneo (signature)
El único control que importa en el teléfono. Input con ícono de escaneo azul a la izquierda, marco azul al 50 % (pleno al hover/foco) con anillo de 4px azul al 15 % en foco, texto en mono; al lado, botón de cámara azul lleno del mismo alto. Tamaño `md` 44px; `xl` 64px con texto 20px e íconos de 28px. Mantiene el foco tras cada lectura para lectores de teclado. La cámara abre un diálogo con marco amarillo de 3px y línea roja pulsante.

### Matasellos (signature)
Círculo de 2.5px en `currentColor`, mono 700. Usos: el sello de 96px "Escaneado/Rechazado" con hora que cae en la esquina tras cada escaneo (animación `stamp-in`: 420ms, escala 1.6 → 1 y rotación a −10° con `cubic-bezier(0.16, 1, 0.3, 1)`; con movimiento reducido aparece quieto); la hora de cada movimiento en verde; el conteo de cada tarea del teléfono; el aviso "N sin ola" sobre el casillero Pendiente; el punto "VM" del wordmark.

### Rack de casilleros (signature)
Una fila de casilleros bajo un mismo marco azul de 2px y radio 10px, divididos por líneas azules al 25 %. Cada casillero: rótulo `.label`, número 2.25rem/900 y una barra de 6px de largo exacto proporcional a su parte; el casillero en alerta pinta número y barra en rojo. Todo el casillero es enlace con hover a hoja doblada.

### Medidor de capacidad
Barra de 112 × 10px con el stock en azul (rojo bajo el mínimo), marca sólida en el mínimo y marca al 50 % en el máximo, seguida del rango en mono.

### Pasos y progreso
Pasos numerados con una barra de 6px debajo: verde si está hecho (y el rótulo tachado con línea verde de 2px), azul si es el actual, línea si falta. Las paradas de picking y las unidades se cuentan con el mismo trío de colores en barras segmentadas.

### Filas de tarea del teléfono
Lista de casillas enmarcada (2px, radio 12px, divisores 2px): ícono 24px azul (rojo si urge), tarea 18px/900, pista 13px gris y el conteo en matasellos de 44px a la derecha; si no hay nada pendiente, un chevrón.

## Do's and Don'ts

### Do:
- **Do** poner el campo de escaneo como acción principal de cada pantalla de bodega, en tamaño `xl` (64px).
- **Do** mostrar el código de ubicación a escala de muestrario (≥ 2.5rem, Overpass Mono 700) cuando el operador debe ir a buscarlo.
- **Do** responder cada escaneo con el matasellos: verde "Escaneado" o rojo "Rechazado", con hora.
- **Do** expresar cantidades y capacidad como barras de largo exacto, y marcar lo terminado con tachado verde.
- **Do** separar superficies con marcos de 2px y el tono hoja sobre papel.
- **Do** usar los tonos de badge desde el mapa de estados, nunca a mano.

### Don't:
- **Don't** usar sombras difusas para elevar tarjetas, menús o diálogos.
- **Don't** construir tarjetas de métricas grises de panel SaaS; los conteos viven en un rack de casilleros.
- **Don't** usar franjas de peligro, negro industrial ni amarillo como texto sobre papel claro.
- **Don't** usar el círculo con borde para nada que no sea un matasellos.
- **Don't** escribir códigos, SKU o cantidades en la fuente sans.
