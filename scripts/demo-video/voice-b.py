"""Pre-generates the narration for design B: one mp3 per line + durations (lines-b.json)."""
import asyncio, json, subprocess
from pathlib import Path
import edge_tts

FF = r"C:\Users\power\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin"
VOICE = "en-US-BrianMultilingualNeural"
HERE = Path(__file__).parent
OUT = HERE / "voice-b"

LINES = {
    "intro": "Les presento VManque WMS: gestión de bodegas multicanal, conectada y con IoT.",
    "s1a": "VManque reúne, en un solo lugar, los pedidos de Mercado Libre, Falabella, Paris y la tienda propia.",
    "s1b": "En el panel se ven en vivo los ingresos del día, del mes y del año, separados por tienda.",
    "s1c": "Cada tienda le envía sus pedidos al servidor mediante un webhook seguro. Y aquí, justo ahora, llega uno nuevo.",
    "s2a": "Veamos cómo viaja la información. La red de la bodega se divide en VLAN: servidores, Wi-Fi de bodega y dispositivos IoT.",
    "s2b": "Primero, el pedido llega desde Internet por HTTPS. El firewall sólo lo deja pasar al servidor, que lo guarda en la base de datos.",
    "s2c": "Después, cuando el operador escanea con su teléfono, la lectura viaja por Wi-Fi hasta el servidor, que la valida antes de descontar el stock.",
    "s2d": "Y para guiarlo, el servidor publica un mensaje MQTT. El ESP32 lo recibe y enciende la tira LED de la estantería.",
    "s2e": "Todo viaja cifrado, con sesiones firmadas, permisos por rol y redes aisladas.",
    "s3a": "En la oficina se agrupan pedidos en una ola. Tomemos uno de Mercado Libre: una olla de greda.",
    "s3b": "El sistema reserva el stock y ordena el recorrido por pasillo, rack y nivel.",
    "s4a": "El operador toma la ola desde su teléfono, conectado por Wi-Fi.",
    "s4b": "En ese momento, el ESP32 recibe la orden por MQTT y enciende el LED de la ubicación para guiarlo.",
    "s4c": "Con la cámara, escanea el código QR de la ubicación…",
    "s4d": "…y luego el código de barras del producto. El sistema confirma que es el correcto.",
    "s4e": "Al confirmar, el LED se apaga y el stock se descuenta al instante en el mapa.",
    "s5a": "En la mesa de separación, cada producto escaneado le indica al operador en qué casilla va su pedido.",
    "s5b": "Al empacar, se verifica el pedido producto por producto, y se imprime la etiqueta de envío.",
    "s5c": "Y al despachar, basta escanear la etiqueta del bulto para entregarlo al transporte.",
    "s5d": "Así, cada pedido queda trazado de principio a fin, con su comisión y su ingreso neto.",
    "s6a": "En el mapa 3D, al buscar un producto, aparecen todas sus ubicaciones y se encienden sus LED.",
    "s6b": "El monitor serie muestra lo mismo que un ESP32 real: Wi-Fi, mensajes MQTT y LED encendidos.",
    "s7": "En resumen, el proyecto aplica las competencias del perfil de egreso de Ingeniería en Conectividad y Redes.",
    "end": "Muchas gracias.",
}


def duration(p):
    return float(subprocess.run([f"{FF}\\ffprobe.exe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout.strip())


async def main():
    OUT.mkdir(exist_ok=True)
    meta = {}
    for k, text in LINES.items():
        f = OUT / f"{k}.mp3"
        await edge_tts.Communicate(text, VOICE).save(str(f))
        meta[k] = {"file": str(f), "dur": duration(f), "text": text.replace("cuatrocientos cuarenta y tres", "443")}
        print(f"{k:6s} {meta[k]['dur']:5.1f}s")
    (HERE / "lines-b.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print("total voz", round(sum(m["dur"] for m in meta.values()), 1), "s")


asyncio.run(main())
