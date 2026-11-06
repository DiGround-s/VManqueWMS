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

## Versión narrada

`narrate.py` lee las frases con la voz neural `es-CL-CatalinaNeural` (paquete `edge-tts`, usa el servicio de voz de Microsoft) y las ubica en el segundo de cada escena. Si una frase no cabe, la acelera hasta +22 %. El video no se vuelve a codificar: el resultado es `video/VManque-WMS-demo-narrado.mp4`, con la imagen intacta y audio AAC estéreo a 48 kHz.

```bash
pip install edge-tts
python narrate.py
```

## Voz más natural (v2) y diseño B

- `narrate2.py narracion-a.json` vuelve a narrar el video original con la voz `en-US-BrianMultilingualNeural`, una voz conversacional de Microsoft que habla español con naturalidad. Lee a velocidad normal y, si una frase no cabe en su escena, alarga esa escena congelando el último cuadro. Resultado: `video/VManque-WMS-demo-narrado-v2.mp4`.
- Diseño B: estilo cinematográfico oscuro, con la app en modo oscuro dentro de una ventana de navegador que muestra la URL, el teléfono a la derecha, tarjetas de capítulo y subtítulos tipo «lower third». La narración va primero y la grabación espera a que termine cada frase, así que no hay cuadros congelados.

```bash
python voice-b.py      # genera voice-b/*.mp3 y lines-b.json
node record-b.mjs      # graba frames-b/ + cuts-b.json + speech-b.json
node build-b.mjs       # video/VManque-WMS-demo-B-narrado.mp4
```

## Versión con música

`music.py` compone una pista original por síntesis (Am–F–C–G a 96 BPM: pad, arpegio, bajo y batería suave), sin samples ni licencias de terceros. Para la versión B sin voz:

```bash
python music.py 191 music.wav
ffmpeg -i VManque-WMS-demo-B-narrado-eleven.mp4 -i music.wav -map 0:v -map 1:a -c:v copy -af "loudnorm=I=-18:TP=-2:LRA=7" -c:a aac -shortest VManque-WMS-demo-B-musica.mp4
```
