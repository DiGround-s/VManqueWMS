# Video de demostración

Genera `video/VManque-WMS-demo.mp4` (1920×1080, unos 2:20, con subtítulos). El video recorre el sistema real:

1. Ventas multicanal.
2. Cómo viaja la información (diagrama de red con VLAN, HTTPS, MQTT y seguridad).
3. Ola de picking.
4. Picking con el teléfono y pick-to-light ESP32.
5. Separar, empacar y despachar.
6. Mapa 3D.
7. Competencias del perfil de egreso.

## Cómo funciona

- `stage.html` es un «escenario» de 1920×1080. Muestra la app de oficina y la del teléfono dentro de iframes, más los subtítulos, la animación de la cámara (QR y EAN-13) y el diagrama de red.
- `record.mjs` maneja la app real con Playwright: crea la ola, escanea, separa, empaca y despacha. Graba cuadro a cuadro con el screencast de Chrome. Las esperas del servidor se marcan y se recortan.
- `build.mjs` arma la lista de cuadros sin esas esperas. Después, ffmpeg la convierte en MP4.

## Requisitos

- El servidor de desarrollo corriendo en `http://localhost:3000`, con los datos del seed (`SEED_RESET=1 pnpm db:seed`) y la ola `OLA-0001` creada.
- Playwright (`npm i playwright && npx playwright install chromium`) y ffmpeg.

## Pasos

```bash
node record.mjs --dry   # prueba sin grabar (modifica la base: respáldala con pg_dump)
node record.mjs         # graba frames/ + frames.json + cuts.json
node build.mjs          # genera list.txt
ffmpeg -f concat -safe 0 -i list.txt -vf "fps=30,format=yuv420p" -c:v libx264 -crf 19 -movflags +faststart demo.mp4
```

La grabación usa el pedido `PED-006344` (Mercado Libre, olla de greda en `A-02-06-03`). Si cambias el seed, ajusta las constantes al inicio de `record.mjs`.
