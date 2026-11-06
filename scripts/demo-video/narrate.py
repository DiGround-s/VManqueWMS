"""Generates the narration track and muxes it over the demo video (video is not modified)."""
import asyncio, json, subprocess, sys
from pathlib import Path
import edge_tts

FF = r"C:\Users\power\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin"
VIDEO = Path(r"C:\Users\power\OneDrive\Escritorio\VManqueWMS\video\VManque-WMS-demo.mp4")
OUT = VIDEO.with_name("VManque-WMS-demo-narrado.mp4")
VOICE = "es-CL-CatalinaNeural"
HERE = Path(__file__).parent
TOTAL = 144.8

# (start in seconds, spoken line). Each line ends before the next one starts.
LINES = [
    (0.4, "VManque WMS: gestión de bodegas multicanal e IoT."),
    (5.6, "VManque reúne en un solo sistema los pedidos de Mercado Libre, Falabella, Paris y la tienda propia."),
    (12.5, "El panel muestra en vivo los ingresos del día, del mes y del año, separados por tienda."),
    (19.1, "Cada tienda envía sus pedidos al servidor por un webhook HTTPS. Aquí llega uno nuevo."),
    (26.3, "La red se divide en VLAN: servidores, Wi-Fi de bodega e IoT."),
    (31.7, "Primero, el pedido llega por HTTPS desde Internet, y el firewall sólo lo deja pasar al servidor."),
    (39.2, "Luego, el teléfono envía cada escaneo por Wi-Fi al servidor, que lo valida contra la base de datos."),
    (46.6, "Para guiarlo, el servidor publica por MQTT y el ESP32 enciende la tira LED."),
    (52.7, "Todo viaja cifrado con TLS, con roles y redes aisladas."),
    (58.1, "En la oficina se agrupan pedidos en una ola. Tomamos uno de Mercado Libre: una olla de greda."),
    (65.1, "El sistema reserva el stock y ordena el recorrido."),
    (68.9, "El operador toma la ola en su teléfono."),
    (73.2, "El ESP32 recibe la orden por MQTT y enciende el LED de la ubicación."),
    (78.8, "Con la cámara, escanea el código QR de la ubicación,"),
    (83.0, "y luego el código de barras: el sistema confirma que es correcto."),
    (87.9, "El LED se apaga y el stock se descuenta."),
    (91.2, "En la mesa de separación, el producto escaneado indica en qué casilla va su pedido."),
    (99.5, "Al empacar, se verifica cada producto y se imprime la etiqueta de envío."),
    (107.9, "Al despachar, se escanea la etiqueta y el pedido queda entregado al transporte."),
    (113.9, "Así, el pedido queda trazado de principio a fin, con su comisión y su ingreso neto."),
    (122.6, "Al buscar un producto, el mapa enciende los LED de todas sus ubicaciones."),
    (129.3, "El monitor serie muestra lo mismo que el ESP32 real: Wi-Fi, MQTT y LED."),
    (135.3, "El proyecto aplica las competencias del perfil de egreso de Ingeniería en Conectividad y Redes."),
    (141.8, "Gracias."),
]


def duration(p):
    out = subprocess.run([f"{FF}\\ffprobe.exe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout
    return float(out.strip())


async def say(text, path, rate):
    await edge_tts.Communicate(text, VOICE, rate=f"{rate:+d}%").save(str(path))


async def main():
    clips = []
    for i, (start, text) in enumerate(LINES):
        end = LINES[i + 1][0] if i + 1 < len(LINES) else TOTAL
        room = end - start - 0.25
        path = HERE / f"line{i:02d}.mp3"
        rate = 4
        await say(text, path, rate)
        d = duration(path)
        # Speed up just enough to fit its scene (keeps it natural: at most +30 %).
        while d > room and rate < 22:
            rate = min(22, rate + max(4, int((d / room - 1) * 100) + 2))
            await say(text, path, rate)
            d = duration(path)
        flag = "  <-- largo" if d > room else ""
        print(f"{i:2d} {start:6.1f}s  {d:4.1f}/{room:4.1f}s  rate {rate:+d}%{flag}")
        clips.append((start, path))

    # Mix all lines at their start times into one track, then mux with the untouched video stream.
    inputs, filters = [], []
    for k, (start, path) in enumerate(clips):
        inputs += ["-i", str(path)]
        ms = int(start * 1000)
        filters.append(f"[{k}:a]adelay={ms}|{ms},aresample=48000[a{k}]")
    mix = "".join(f"[a{k}]" for k in range(len(clips)))
    filters.append(f"{mix}amix=inputs={len(clips)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad[aout]")
    track = HERE / "narration.m4a"
    subprocess.run([f"{FF}\\ffmpeg.exe", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filters), "-map", "[aout]", "-t", str(TOTAL), "-ac", "2", "-c:a", "aac", "-b:a", "160k", str(track)], check=True)
    subprocess.run([f"{FF}\\ffmpeg.exe", "-y", "-loglevel", "error", "-i", str(VIDEO), "-i", str(track), "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest", "-movflags", "+faststart",
                    "-metadata", "title=VManque WMS - Demo narrada", str(OUT)], check=True)
    print("listo:", OUT, f"{OUT.stat().st_size / 1e6:.1f} MB")


asyncio.run(main())
