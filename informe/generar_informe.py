# Genera el informe final en Word a partir del informe 2.7 (portada, índice y secciones 1-4 con sus figuras)
# y reescribe desde la sección 5 con el plan de mejoras, las pruebas y las evidencias del laboratorio.
#   python informe/generar_informe.py
# Lee los resultados de las pruebas de iot-lab/evidencia/*.json y las imágenes de informe/img/.
import copy
import json
import os
from datetime import date

import docx
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
BASE = os.path.join(AQUI, "base", "Informe_Capstone_2.7.docx")
SALIDA = os.path.join(AQUI, "Informe_Capstone_Grupo5_final.docx")
IMG = os.path.join(AQUI, "img")
EVID = os.path.join(RAIZ, "iot-lab", "evidencia")


def evidencia(nombre):
    ruta = os.path.join(EVID, f"{nombre}.json")
    if not os.path.exists(ruta):
        return None
    with open(ruta, encoding="utf-8") as f:
        return json.load(f)


d = docx.Document(BASE)
body = d.element.body
hijos = list(body.iterchildren())

# 1) Cortar todo desde «5. Integración IoT» (se reescribe). Se conserva el sectPr final.
corte = None
for i, el in enumerate(hijos):
    if el.tag.endswith("}p") and "".join(el.itertext()).strip().startswith("5. Integración IoT"):
        corte = i
        break
# Las figuras originales de la sección 5.4 (mapa 3D y monitor serie simulado) se conservan.
imagenes_54 = [copy.deepcopy(el) for el in hijos[corte:] if el.tag.endswith("}p") and el.xpath(".//w:drawing")]
for el in hijos[corte:]:
    if not el.tag.endswith("}sectPr"):
        body.remove(el)
sectPr = body.find(qn("w:sectPr"))

# 2) Ajustes a lo que se conserva: título e introducción.
for p in d.paragraphs:
    if p.text.strip() == "Capstone Actividad 2.7":
        for r in p.runs[1:]:
            r.text = ""
        p.runs[0].text = "Capstone · Informe final con Plan de Mejoras"
    if p.text.startswith("Prof. Pablo penailillo"):
        for r in p.runs[1:]:
            r.text = ""
        p.runs[0].text = "Prof. Pablo Peñailillo"
    if p.text.startswith("Este informe presenta la decisión final"):
        nuevo = copy.deepcopy(p._p)
        p._p.addnext(nuevo)
        q = docx.text.paragraph.Paragraph(nuevo, p._parent)
        for r in q.runs[1:]:
            r.text = ""
        q.runs[0].text = (
            "Esta versión incorpora el Plan de Mejoras del Grupo 5. Cada observación del plan tiene aquí una sección, "
            "una prueba reproducible y su resultado esperado y obtenido. Se distingue con claridad lo que está implementado "
            "y probado, lo que se probó en simulación y lo que todavía falta demostrar con hardware físico. El Anexo A explica "
            "cómo levantar todo en un PC para repetir las pruebas."
        )

# Tabla 2: la columna de criterios de aceptación estaba vacía (plan de mejoras 1.8).
CRITERIOS = {
    "Objetivo específico": "Criterio de aceptación (medible)",
    "Infraestructura de red con pfSense y servidor Ubuntu": "3 VLAN con DHCP y las 9 pruebas RED con el resultado esperado (secc. 8.5)",
    "Base de datos de productos, ubicaciones y stock": "12/12 pruebas de integridad; nunca stock negativo (secc. 6)",
    "Interfaz web para oficina y teléfono": "Un operador completa un pedido de punta a punta desde el teléfono (secc. 9.3)",
    "API para tiendas y sistemas externos": "21/21 pruebas GET/POST y persistencia tras reinicio (secc. 9)",
    "Pick-to-light con ESP32 y LED": "Para 3 productos en posiciones distintas, el ESP32 confirma la tira y píxeles esperados (secc. 5.6)",
    "Autenticación, roles y protección de la red": "Pruebas de roles, sesión, CORS y MQTT sin fallas (secc. 5.5 y 7.6)",
    "Pruebas con varios usuarios simultáneos": "Dos retiros simultáneos de la última unidad: sólo uno lo logra (INT-12); dos olas en picking a la vez (IOT-06)",
}
t2 = d.tables[0]
for gc, w in zip(t2._tbl.tblGrid.findall(qn("w:gridCol")), (3900, 5445)):
    gc.set(qn("w:w"), str(w))  # la columna de criterios venía con 255 (casi invisible)
for fila in t2.rows:
    fila.cells[0].width = Cm(6.9)
    fila.cells[1].width = Cm(9.6)
for fila in t2.rows:
    clave = fila.cells[0].text.strip()
    if clave in CRITERIOS and not fila.cells[1].text.strip():
        cel = fila.cells[1]
        r = cel.paragraphs[0].add_run(CRITERIOS[clave])
        r.bold = clave == "Objetivo específico"

# Los estilos de título del original no tenían nivel de esquema, por eso el índice salía vacío.
for nombre, nivel in (("Heading 1", 0), ("Heading 2", 1), ("Heading 3", 2)):
    pPr = d.styles[nombre].element.get_or_add_pPr()
    for viejo in pPr.findall(qn("w:outlineLvl")):
        pPr.remove(viejo)
    ol = OxmlElement("w:outlineLvl")
    ol.set(qn("w:val"), str(nivel))
    pPr.append(ol)

# El índice usaba nombres de estilo en inglés, que Word en español no encuentra: se usa el nivel de esquema.
for it in body.iter(qn("w:instrText")):
    if it.text and it.text.strip().startswith("TOC"):
        it.text = r' TOC \o "1-2" \h \z \u '

# Pide a Word actualizar el índice al abrir.
settings = d.settings.element
uf = OxmlElement("w:updateFields")
uf.set(qn("w:val"), "true")
settings.append(uf)

# ---------- utilidades de escritura ----------
estilo_tabla = d.tables[0].style if d.tables else None
nfig = [6]
ntab = [4]


def _antes_de_sectpr(el):
    sectPr.addprevious(el)


def par(texto="", estilo="normal", negrita=False, italica=False, centro=False, tam=None, color=None):
    p = d.add_paragraph(style=estilo)
    _antes_de_sectpr(p._p)
    if texto:
        # **negrita** sencilla dentro del texto
        partes = texto.split("**")
        for k, t in enumerate(partes):
            if not t:
                continue
            r = p.add_run(t)
            r.bold = negrita or (k % 2 == 1)
            r.italic = italica
            if tam:
                r.font.size = Pt(tam)
            if color:
                r.font.color.rgb = RGBColor.from_string(color)
    if centro:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return p


def h1(t):
    return par(t, "Heading 1")


def h2(t):
    return par(t, "Heading 2")


def h3(t):
    return par(t, "Heading 3")


def vineta(t):
    p = par("•  " + t)
    p.paragraph_format.left_indent = Cm(0.8)
    p.paragraph_format.first_line_indent = Cm(-0.5)
    p.paragraph_format.space_after = Pt(3)
    return p


def numerada(n, t):
    p = par(f"{n}.  " + t)
    p.paragraph_format.left_indent = Cm(0.8)
    p.paragraph_format.first_line_indent = Cm(-0.5)
    p.paragraph_format.space_after = Pt(3)
    return p


def codigo(t):
    p = par()
    r = p.add_run(t)
    r.font.name = "Consolas"
    r.font.size = Pt(9.5)
    p.paragraph_format.left_indent = Cm(0.6)
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear")
    sh.set(qn("w:fill"), "F1F3F6")
    p._p.get_or_add_pPr().append(sh)
    return p


def leyenda(t):
    p = par(t, italica=True, centro=True, tam=9.5, color="4A5263")
    p.paragraph_format.space_after = Pt(10)
    return p


def figura(archivo, titulo, explica, ancho=16):
    ruta = os.path.join(IMG, archivo)
    if not os.path.exists(ruta):
        par(f"[Falta la imagen {archivo}]", italica=True)
        return
    p = par(centro=True)
    p.add_run().add_picture(ruta, width=Cm(ancho))
    nfig[0] += 1
    leyenda(f"Figura {nfig[0]}. {titulo}. {explica}")


def _sombrear(celda, color):
    tcPr = celda._tc.get_or_add_tcPr()
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear")
    sh.set(qn("w:fill"), color)
    tcPr.append(sh)


def tabla(titulo, cab, filas, anchos=None, tam=9):
    ntab[0] += 1
    t0 = par(f"Tabla {ntab[0]}. {titulo}", negrita=True, tam=10)
    t0.paragraph_format.keep_with_next = True
    t = d.add_table(rows=1, cols=len(cab))
    _antes_de_sectpr(t._tbl)
    if estilo_tabla is not None:
        t.style = estilo_tabla
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, c in enumerate(cab):
        cel = t.rows[0].cells[i]
        cel.text = ""
        r = cel.paragraphs[0].add_run(c)
        r.bold = True
        r.font.size = Pt(tam)
        r.font.color.rgb = RGBColor(255, 255, 255)
        _sombrear(cel, "1D2330")
    for fila in filas:
        celdas = t.add_row().cells
        for i, v in enumerate(fila):
            celdas[i].text = ""
            txt = str(v)
            r = celdas[i].paragraphs[0].add_run(txt)
            r.font.size = Pt(tam)
            if txt in ("OK", "Sí", "Implementado y probado"):
                _sombrear(celdas[i], "DFF3E6")
            elif txt.startswith("FALLA"):
                _sombrear(celdas[i], "F8D7D4")
            elif txt.startswith("Pendiente") or txt.startswith("Por ejecutar") or txt.startswith("Parcial"):
                _sombrear(celdas[i], "FFF1D6")
    if anchos and cab[-1] == "Resultado" and anchos[-1] < 1.9:
        anchos = list(anchos)
        falta = 1.9 - anchos[-1]
        anchos[-1] = 1.9
        mayor = max(range(len(anchos) - 1), key=lambda i: anchos[i])
        anchos[mayor] -= falta
    if anchos:
        # Word respeta los anchos sólo con diseño fijo y la grilla de columnas definida.
        tblPr = t._tbl.tblPr
        lay = OxmlElement("w:tblLayout")
        lay.set(qn("w:type"), "fixed")
        tblPr.append(lay)
        for gc, w in zip(t._tbl.tblGrid.findall(qn("w:gridCol")), anchos):
            gc.set(qn("w:w"), str(int(w * 567)))
        for fila in t.rows:
            for i, w in enumerate(anchos):
                fila.cells[i].width = Cm(w)
    # repetir encabezado en cada página
    trPr = t.rows[0]._tr.get_or_add_trPr()
    th = OxmlElement("w:tblHeader")
    th.set(qn("w:val"), "true")
    trPr.append(th)
    par()
    return t


def salto():
    # El estilo Heading 1 del original ya empieza en página nueva; no se agrega otro salto.
    pass


def casos(nombre, columnas=("id", "prueba", "esperado", "obtenido", "resultado"), recorte=110):
    ev = evidencia(nombre)
    if not ev:
        return [], None
    filas = []
    for c in ev["casos"]:
        f = []
        for col in columnas:
            v = str(c.get(col, ""))
            f.append(v if len(v) <= recorte else v[: recorte - 1] + "…")
        filas.append(f)
    return filas, ev


def resumen(ev):
    if not ev:
        return "sin ejecutar", 0, 0
    ok = sum(1 for c in ev["casos"] if c["resultado"] == "OK")
    return f"{ok}/{len(ev['casos'])}", ok, len(ev["casos"])


api_f, api_ev = casos("api", ("id", "prueba", "esperado", "obtenido", "resultado"), 110)
if api_ev:  # la petición HTTP va bajo el nombre de la prueba
    for f, c in zip(api_f, api_ev["casos"]):
        f[1] = c["prueba"] + "\n" + c["peticion"]
per_f, per_ev = casos("api-persistencia", ("id", "prueba", "esperado", "obtenido", "resultado"), 120)
int_f, int_ev = casos("integridad", ("id", "prueba", "esperado", "obtenido", "resultado"), 120)
rol_f, rol_ev = casos("roles")
seg_f, seg_ev = casos("seguridad", recorte=130)
mqtt_f, mqtt_ev = casos("mqtt")
iot_ev = evidencia("iot")
fecha_pruebas = date.today().strftime("%d-%m-%Y")

# =====================================================================================
h1("5. Integración IoT: pick-to-light con ESP32")
par(
    "Esta sección responde a la observación principal del plan de mejoras (puntos 1.2 y 2.3): demostrar que una "
    "solicitud del usuario llega al ESP32 y enciende el LED de la estantería correcta, y no conformarse con un mensaje "
    "de consola del servidor."
)
h2("5.1 Cómo viaja la orden")
figura(
    "diagrama-flujo.png",
    "Flujo pick-to-light de extremo a extremo",
    "Cada flecha indica el protocolo y el puerto usados. La confirmación (paso 6) es la que prueba que el dispositivo recibió y ejecutó la orden",
)
numerada(1, "**Solicitud.** El usuario busca o escanea un producto en la web, o avanza su ola de picking en el teléfono (HTTPS, puerto 443).")
numerada(2, "**Consulta.** El servidor pregunta a PostgreSQL (puerto 5432, sólo dentro del servidor) en qué casillas hay stock del producto.")
numerada(3, "**Ubicación.** Para VM-0021 la base responde A-02-06-03 (19 u., picking) y B-01-06-01 (37 u., reserva).")
numerada(4, "**Orden MQTT.** Por cada casilla se publica un mensaje en el tema vmanque/bc/led/<ubicación>, por ejemplo vmanque/bc/led/A-02-06-03 con {\"on\":1,\"color\":\"green\",\"blink\":1}. Para apagar se envía {\"on\":0}.")
numerada(5, "**Activación.** El broker entrega el mensaje al ESP32 (suscrito a vmanque/bc/led/# con QoS 1). El ESP32 calcula los píxeles y los enciende en la tira del pasillo.")
numerada(6, "**Confirmación (nuevo).** Después de pintar la tira, el ESP32 publica en vmanque/bc/ack/<ubicación> qué tira, qué píxeles y qué color encendió. El servidor compara con lo esperado y anota OK o FALLA en un registro CSV con fecha, producto, ubicación, dispositivo, color esperado y resultado.")
par(
    "MQTT es un protocolo de mensajería liviano de tipo publicar/suscribir sobre TCP. El servidor no necesita conocer la IP "
    "del ESP32: ambos se conectan al broker y se comunican por «temas». Esto es importante para la red, porque la conexión "
    "siempre la abre el ESP32 hacia el servidor (VLAN 30 → VLAN 10, TCP 1883). El servidor nunca necesita abrir conexiones "
    "hacia la VLAN IoT, lo que simplifica las reglas del firewall (sección 8)."
)
h2("5.2 Mapeo de ubicaciones a LED")
par(
    "Hay una tira WS2812B por pasillo (A-01, A-02, B-01) de 144 píxeles (2,4 m a 60 LED/m). Cada casilla (rack + nivel) "
    "usa 6 píxeles. El primer píxel se calcula así:"
)
codigo("primer_pixel = ((rack - 1) * 4 + (nivel - 1)) * 6\nA-02-06-03  →  tira A-02, ((6-1)*4 + (3-1)) * 6 = 132  →  píxeles 132 a 137")
par("El mismo cálculo está en el firmware, en la web y en el localizador del laboratorio, así que los tres siempre coinciden.")
tabla(
    "Productos usados en las pruebas y LED esperado",
    ["Producto", "Ubicación", "Tipo", "Tira", "Píxeles esperados"],
    [
        ["VM-0021 Olla de greda de Pomaire", "A-02-06-03", "Picking", "A-02 (GPIO 18)", "132–137"],
        ["VM-0021 Olla de greda de Pomaire", "B-01-06-01", "Reserva", "B-01 (GPIO 19)", "120–125"],
        ["VM-0001 Termo acero inoxidable 1 L", "A-01-01-01", "Picking", "A-01 (GPIO 5)", "0–5"],
        ["VM-0001 Termo acero inoxidable 1 L", "A-02-02-01", "Picking", "A-02 (GPIO 18)", "24–29"],
        ["VM-0018 Gorro de lana tejido", "A-01-06-03", "Picking", "A-01 (GPIO 5)", "132–137"],
        ["VM-0018 Gorro de lana tejido", "B-01-05-02", "Reserva", "B-01 (GPIO 19)", "102–107"],
    ],
    [5.2, 2.4, 1.8, 3, 2.8],
)
h2("5.3 Hardware y conexión")
tabla(
    "Hardware del módulo pick-to-light",
    ["Elemento", "Detalle"],
    [
        ["Microcontrolador", "ESP32 DevKit V1 (ESP-WROOM-32), Wi-Fi 2,4 GHz"],
        ["LED", "Tira WS2812B 60 LED/m, 144 píxeles por pasillo"],
        ["Pines de datos", "GPIO 5 → pasillo A-01 · GPIO 18 → A-02 · GPIO 19 → B-01 (resistencia de 330 Ω en la línea de datos)"],
        ["Alimentación", "Fuente de 5 V aparte (≈ 20 mA por LED a brillo 80/255), condensador de 1000 µF, tierra común con el ESP32"],
        ["Opcional", "Conversor de nivel 3,3 V → 5 V (74AHCT125) para la señal de datos"],
        ["Librerías", "PubSubClient (MQTT), Adafruit NeoPixel, ArduinoJson"],
        ["Red", "SSID «VManque-IoT» (WPA2), VLAN 30, IP reservada 192.168.30.40, usuario MQTT propio"],
    ],
    [3.5, 12],
)
h2("5.4 Laboratorio sin hardware: el mismo firmware en un ESP32 emulado")
par(
    "El grupo no cuenta todavía con el ESP32 ni con las tiras LED. Para no depender de una animación de la web, se armó "
    "un laboratorio que ejecuta el **firmware real** sobre un ESP32 emulado:"
)
vineta("**Wokwi para VS Code** emula el microcontrolador ESP32 (el mismo binario que se cargaría en la placa) y tres tiras WS2812B. La señal de datos de cada GPIO se decodifica y se dibuja píxel a píxel.")
vineta("El Wi-Fi del ESP32 emulado («Wokwi-GUEST») sale por un gateway que la extensión ejecuta en el PC. Desde el ESP32, el nombre host.wokwi.internal apunta al propio PC, donde corre el broker.")
vineta("**Broker MQTT local** (iot-lab/broker.mjs): cumple el papel de Mosquitto en el servidor Ubuntu. Exige usuario y clave, y aplica una lista de control de acceso por tema (sección 5.5).")
vineta("**Localizador** (iot-lab/localizador.mjs): lee la base de datos de la web en modo sólo lectura, publica las órdenes, espera la confirmación del ESP32 y registra el resultado. Tiene un modo «picking» que sigue las olas que los operadores trabajan en la web y enciende la próxima casilla de cada ola, con un color por ola.")
par(
    "La única diferencia entre el firmware del laboratorio y el de la bodega es la configuración de red (SSID, IP del "
    "broker y claves), que se elige con una línea al inicio del archivo (#define WOKWI_LAB). La lógica de recepción, el "
    "cálculo de píxeles y el control de las tiras son exactamente los mismos."
)
par(
    "**Límite declarado:** el laboratorio demuestra que el software y la comunicación funcionan de extremo a extremo con el "
    "código real, pero sigue siendo una simulación. No reemplaza la prueba con la placa y la tira físicas, que se mantiene "
    "como pendiente en la Tabla de pruebas IOT y en el cronograma.",
    color="8A5300",
)
par(
    "Se intentó primero con la versión web de Wokwi (wokwi.com). El firmware compiló y arrancó, pero su red Wi-Fi pública "
    "rechazó la conexión (error 503 del gateway en la nube), por lo que se optó por la extensión de VS Code, que trae el "
    "gateway incluido y además permite conectarse a servicios del propio PC."
)
par(
    "Además, la propia web incluye un panel que simula el ESP32 en el mapa 3D, con los mismos temas, mensajes y mapeo de "
    "píxeles que el firmware. Sirve para la demostración en pantalla, pero no prueba la recepción en el dispositivo; por "
    "eso se agregó el laboratorio con el firmware real descrito arriba."
)
textos_54 = [
    ("Mapa 3D: búsqueda de VM-0021", "La casilla A-02-06-03 se ilumina en el mapa y el panel lateral muestra el stock por ubicación. Es la misma información que el localizador envía al ESP32"),
    ("Panel pick-to-light simulado en la web", "Monitor serie con los mensajes MQTT recibidos y los píxeles encendidos. Es una simulación visual dentro de la web, no evidencia del dispositivo"),
]
for el, (tit, exp) in zip(imagenes_54, textos_54):
    _antes_de_sectpr(el)
    nfig[0] += 1
    leyenda(f"Figura {nfig[0]}. {tit}. {exp}")
if os.path.exists(os.path.join(IMG, "wokwi-vscode-A-02-06-03.png")):
    figura(
        "wokwi-vscode-A-02-06-03.png",
        "ESP32 emulado en Wokwi para VS Code encendiendo A-02-06-03",
        "Firmware real, tira A-02, píxeles 132–137 en verde, y monitor serie con la orden recibida",
        15.5,
    )
h2("5.5 Seguridad del broker MQTT")
par(
    "El broker no acepta conexiones anónimas. Cada equipo tiene su propio usuario y sólo puede usar sus temas. Así, si "
    "alguien compromete un ESP32, no puede encender casillas de otros pasillos ni leer el resto del tráfico."
)
tabla(
    "Permisos por usuario MQTT",
    ["Usuario", "Puede publicar en", "Puede suscribirse a", "Para qué"],
    [
        ["servidor", "vmanque/bc/led/#", "vmanque/bc/ack/#", "Envía órdenes y recibe confirmaciones"],
        ["esp32-bc-01", "vmanque/bc/ack/#", "vmanque/bc/led/#", "Recibe órdenes y confirma"],
        ["monitor", "(nada)", "vmanque/#", "Diagnóstico: sólo lectura"],
    ],
    [2.8, 3.8, 3.8, 5.1],
)
tabla(
    f"Pruebas de seguridad del broker MQTT ({resumen(mqtt_ev)[0]} OK)",
    ["ID", "Prueba", "Esperado", "Obtenido", "Resultado"],
    mqtt_f,
    [1.7, 4.8, 3.6, 4, 1.6],
)
h2("5.6 Protocolo de prueba del pick-to-light")
iot_filas = [
    ["IOT-01", "Arrancar el ESP32 y revisar el monitor serie (115200 baudios)", "Conecta al Wi-Fi, al broker como esp32-bc-01 y se suscribe a vmanque/bc/led/#"],
    ["IOT-02", "Encender a mano A-02-06-03 (node localizador.mjs encender A-02-06-03)", "Tira A-02, píxeles 132–137 en verde; ack con esos píxeles"],
    ["IOT-03", "Buscar VM-0021 (node localizador.mjs buscar VM-0021)", "Se encienden A-02-06-03 y B-01-06-01; dos ack OK en el CSV"],
    ["IOT-04", "Buscar VM-0001 y VM-0018 (posiciones distintas, colores azul y amarillo)", "Se encienden sólo las casillas de la Tabla de productos"],
    ["IOT-05", "Apagar (node localizador.mjs apagar)", "Llega {\"on\":0} y las casillas se apagan; ack «off»"],
    ["IOT-06", "Modo picking: dos olas en curso a la vez", "Cada ola enciende su próxima casilla con su color, sin apagar la del otro"],
    ["IOT-07", "Detener y reanudar la simulación (corte de Wi-Fi)", "El ESP32 se reconecta solo y vuelve a suscribirse"],
]
resultados_iot = {c["id"]: c for c in iot_ev["casos"]} if iot_ev else {}
filas = []
for f in iot_filas:
    c = resultados_iot.get(f[0])
    filas.append([f[0], f[1], f[2], c["obtenido"] if c else "Por ejecutar en Wokwi VS Code (Anexo A.4)", c["resultado"] if c else "Pendiente"])
tabla("Pruebas IOT en el laboratorio (ESP32 emulado)", ["ID", "Prueba", "Esperado", "Obtenido", "Resultado"], filas, [1.5, 4.6, 4.6, 3.4, 1.6])
par(
    "Con hardware físico se repiten las mismas pruebas, agregando una foto o video de la tira encendida en la estantería "
    "correcta por cada producto. Ese registro es la evidencia que el plan de mejoras exige para afirmar que el sistema "
    "completo está operativo."
)

# =====================================================================================
h1("6. Base de datos e integridad del inventario")
par(
    "La base de datos PostgreSQL 16 tiene 22 tablas. Las principales para este proyecto son Product (productos), "
    "Location (casillas), StockLevel (cantidad por producto y casilla), StockMovement (historial de movimientos), "
    "Order y OrderLine (pedidos), Wave y PickTask (olas de picking) y User y ApiKey (acceso). Los cambios de estructura "
    "se aplican con migraciones versionadas, nunca a mano."
)
tabla(
    "Estructura de datos principal",
    ["Tabla", "Qué guarda", "Reglas"],
    [
        ["Product", "SKU, nombre, código de barras, precio", "SKU y código de barras únicos"],
        ["Location", "Código (A-02-06-03), zona, pasillo, rack, nivel, tipo (picking/reserva/andén)", "Código único por bodega"],
        ["StockLevel", "Cantidad de un producto en una casilla", "qty ≥ 0 (CHECK); casilla y producto deben existir (FK)"],
        ["StockMovement", "Cada entrada, salida, ajuste o traspaso, con usuario y fecha", "qty > 0; sólo se agregan filas"],
        ["OrderLine", "Líneas de pedido y avance (recogido, separado, empacado)", "0 ≤ recogido ≤ pedido; separado ≤ recogido; empacado ≤ separado"],
        ["PickTask", "Paradas de una ola: producto, casilla, cantidad", "recogido ≤ requerido"],
        ["Dispositivo IoT", "La casilla se asocia a su tira y píxeles por cálculo (sección 5.2), no por tabla", "Sólo casillas con pasillo/rack/nivel válidos tienen LED"],
    ],
    [2.8, 6.8, 5.9],
)
par("**Cómo se actualiza el stock sin dejar datos inconsistentes:**")
vineta("Todo cambio de stock pasa por una sola función del servidor, que descuenta con la condición «sólo si hay suficiente» (qty ≥ n) y escribe el movimiento en la misma transacción.")
vineta("Si cualquier parte falla, la transacción se deshace completa (ROLLBACK): no queda un descuento sin su movimiento ni al revés.")
vineta("Aunque hubiera un error en la aplicación, la base rechaza por sí sola los valores imposibles (CHECK, UNIQUE y FOREIGN KEY).")
vineta("Disponible = stock en estanterías − unidades comprometidas por pedidos pendientes. El andén no cuenta hasta ubicarlo.")
par(
    "Las pruebas intentan guardar datos inválidos directamente en la base, cada una dentro de una transacción que se "
    "deshace al final para no alterar los datos. La prueba INT-12 simula a dos operadores que intentan sacar la última "
    "unidad al mismo tiempo: sólo uno lo logra."
)
tabla(f"Pruebas de integridad de PostgreSQL ({resumen(int_ev)[0]} OK)", ["ID", "Prueba", "Esperado", "Obtenido", "Resultado"], int_f, [1.5, 4.2, 3.6, 4.7, 1.5], 8.5)

# =====================================================================================
h1("7. Seguridad de la aplicación")
h2("7.1 Autenticación de usuarios")
vineta("Las contraseñas se guardan con bcrypt (hash con sal y costo 10), nunca en texto plano, a diferencia del script de consola de la Fase 2.5.")
vineta("Si el correo no existe, igual se compara contra un hash ficticio. Así un atacante no puede saber qué correos están registrados midiendo el tiempo de respuesta.")
vineta("La sesión es un token JWT firmado (HS256) guardado en una cookie httpOnly (JavaScript no puede leerla), SameSite=Lax y Secure en producción. Dura 7 días.")
vineta("Un middleware revisa la firma en cada página. Sin sesión válida, redirige a /login.")
figura("web-02-login-error.png", "Login con clave incorrecta", "Mensaje genérico «Correo o contraseña incorrectos»: no revela si el correo existe", 14)
h2("7.2 Autorización por rol")
tabla(
    "Matriz de permisos por rol",
    ["Permiso", "Operador", "Supervisor", "Administrador"],
    [
        ["Modo bodega completo (picking, separar, empacar, despachar, recibir, mover, contar)", "Sí", "Sí", "Sí"],
        ["Consultar inventario, pedidos y mapa", "Sí", "Sí", "Sí"],
        ["Crear, importar y cancelar pedidos; crear olas", "No", "Sí", "Sí"],
        ["Ajustes manuales de stock, recepciones, ubicaciones y productos", "No", "Sí", "Sí"],
        ["Usuarios, API keys y ajustes de la empresa", "No", "No", "Sí"],
    ],
    [8.5, 2.3, 2.3, 2.4],
)
par(
    "Los permisos se validan en el servidor en cada acción. La interfaz sólo oculta lo que no corresponde; aunque alguien "
    "llame la acción directamente, el servidor la rechaza con «No tienes permiso para esta acción»."
)
figura("web-05-operador-denegado.png", "Operador que intenta abrir Usuarios", "El servidor lo devuelve al inicio con el aviso «No tienes permiso para esa sección»", 14)
h2("7.3 Validación de entradas")
par(
    "Todas las entradas se validan en el servidor antes de tocar la base de datos: tipos, largos, rangos, cantidades "
    "enteras ≥ 1, prioridad 0–9 y máximo 500 líneas por pedido. Las consultas a la base van parametrizadas, lo que evita "
    "la inyección SQL. Los errores inesperados se registran en el servidor y al usuario sólo se le muestra un mensaje "
    "genérico (ver pruebas API-10 a API-16)."
)
h2("7.4 API keys y protección de secretos")
vineta("La API /api/v1 exige la cabecera Authorization: Bearer vmk_…. Sólo un administrador crea keys.")
vineta("La key se muestra una sola vez. En la base sólo queda su huella SHA-256, de modo que una filtración de la base no expone las keys.")
vineta("Cada key se puede revocar y registra su último uso.")
vineta("Los secretos (DATABASE_URL y SESSION_SECRET de al menos 32 caracteres) viven en el archivo .env o en las variables del servidor, excluidos del repositorio. La aplicación no arranca si el secreto es corto.")
figura("web-04-api-key.png", "Creación de una API key", "La key se muestra una sola vez (en la captura se ocultó). En la base sólo queda su huella", 14)
h2("7.5 Política CORS")
par(
    "CORS es el mecanismo con que un navegador decide si una página de otro sitio puede leer las respuestas de nuestra "
    "API. La política aplicada es **no habilitar ningún origen externo**:"
)
vineta("La web y su API se sirven desde el mismo origen (mismo dominio y puerto), así que la interfaz no necesita CORS.")
vineta("La API /api/v1 no envía la cabecera Access-Control-Allow-Origin. Un navegador en otro sitio no puede leer las respuestas, aunque tuviera una key.")
vineta("Los sistemas que sí deben integrarse (tiendas, marketplaces) llaman a la API de servidor a servidor con su API key. Eso no pasa por CORS y queda autenticado y registrado.")
vineta("Si en el futuro una página externa necesitara la API, se agregaría sólo ese origen, sólo los métodos GET/POST y sólo las cabeceras Authorization y Content-Type. Nunca «*».")
h2("7.6 Pruebas de seguridad")
tabla(f"Pruebas de autenticación y autorización por rol con navegador ({resumen(rol_ev)[0]} OK)", ["ID", "Prueba", "Esperado", "Obtenido", "Resultado"], rol_f, [1.5, 4.6, 3.6, 4.4, 1.5], 8.5)
tabla(f"Pruebas de sesión, CORS, almacenamiento y modo producción ({resumen(seg_ev)[0]} OK)", ["ID", "Prueba", "Esperado", "Obtenido", "Resultado"], seg_f, [1.5, 4, 3.6, 5, 1.5], 8.5)

# =====================================================================================
h1("8. Segmentación y seguridad de red")
h2("8.1 Direccionamiento por VLAN")
tabla(
    "Plan de direccionamiento",
    ["VLAN", "Nombre", "Subred", "Gateway (pfSense)", "Equipos"],
    [
        ["10", "Servidores y oficina", "192.168.10.0/24", "192.168.10.1", "Servidor Ubuntu 192.168.10.10 (web, PostgreSQL, Mosquitto); PC de oficina por DHCP .100–.199"],
        ["20", "Bodega Wi-Fi", "192.168.20.0/24", "192.168.20.1", "Teléfonos de operadores y lectores, SSID «VManque-Bodega» WPA2"],
        ["30", "IoT", "192.168.30.0/24", "192.168.30.1", "ESP32 192.168.30.40 (reserva DHCP por MAC), SSID «VManque-IoT» WPA2"],
    ],
    [1.2, 2.8, 3, 2.8, 5.7],
)
par(
    "Esto hace evolucionar la red de la Fase 2.5 (una sola red Red_Sitio_A, 192.168.1.0/24) hacia una red segmentada, "
    "conservando pfSense como gateway y el servidor Ubuntu con IP estática. En un equipo real, pfSense lleva las tres VLAN "
    "etiquetadas (802.1Q) por un enlace troncal hacia un switch administrable, y el access point publica un SSID por VLAN."
)
figura("diagrama-red.png", "Diagrama de red segmentada", "Segmentos, direcciones IP y flujos permitidos. Todo lo que no tiene flecha verde se bloquea", 16)
h2("8.2 Qué comunicaciones se permiten")
vineta("**Teléfonos (VLAN 20) → servidor:** sólo HTTPS 443 a la web. No llegan a PostgreSQL, al broker ni a otros equipos.")
vineta("**ESP32 (VLAN 30) → servidor:** sólo MQTT TCP 1883 hacia 192.168.10.10. Sin Internet, sin acceso a oficina ni a la bodega Wi-Fi.")
vineta("**Oficina (VLAN 10) → servidor:** HTTPS 443 y SSH 22 (administración). La interfaz de pfSense sólo se administra desde la oficina.")
vineta("**Servidor → Internet:** sólo HTTP/HTTPS y DNS para actualizaciones del sistema.")
vineta("**PostgreSQL** escucha sólo en el propio servidor (127.0.0.1). Ningún equipo de la red puede conectarse al puerto 5432.")
vineta("**Entre VLAN:** todo lo no listado se bloquea con una regla final «denegar todo» que además queda registrada en el log del firewall.")
h2("8.3 Matriz de reglas de pfSense")
par("pfSense evalúa las reglas de arriba hacia abajo en la interfaz por donde entra el tráfico y aplica la primera que coincide.")
tabla(
    "Reglas del firewall por interfaz",
    ["#", "Interfaz", "Origen", "Destino", "Proto / puerto", "Acción", "Justificación"],
    [
        ["1", "VLAN10", "VLAN10 net", "192.168.10.1 (pfSense)", "TCP 443", "Permitir", "Administrar pfSense sólo desde oficina"],
        ["2", "VLAN10", "VLAN10 net", "192.168.10.10", "TCP 443, 22", "Permitir", "Usar la web y administrar el servidor"],
        ["3", "VLAN10", "192.168.10.10", "Internet (!RFC1918)", "TCP 80, 443; UDP 53", "Permitir", "Actualizaciones del sistema"],
        ["4", "VLAN10", "VLAN10 net", "VLAN20, VLAN30", "Cualquiera", "Bloquear", "El servidor no necesita abrir conexiones hacia teléfonos ni IoT"],
        ["5", "VLAN20", "VLAN20 net", "192.168.10.10", "TCP 443", "Permitir", "Teléfonos usan la web (modo bodega)"],
        ["6", "VLAN20", "VLAN20 net", "192.168.20.1", "UDP 53", "Permitir", "DNS del propio pfSense"],
        ["7", "VLAN20", "VLAN20 net", "RFC1918 (redes privadas)", "Cualquiera", "Bloquear + log", "Sin acceso a otras VLAN ni a pfSense"],
        ["8", "VLAN20", "VLAN20 net", "Internet", "TCP 80, 443", "Permitir", "Navegación básica de los teléfonos"],
        ["9", "VLAN30", "192.168.30.40", "192.168.10.10", "TCP 1883", "Permitir", "ESP32 → broker MQTT (única necesidad)"],
        ["10", "VLAN30", "VLAN30 net", "Cualquiera", "Cualquiera", "Bloquear + log", "IoT aislado: sin Internet ni otras VLAN"],
        ["11", "WAN", "Cualquiera", "Cualquiera", "Cualquiera", "Bloquear", "Por defecto nada entra desde Internet"],
    ],
    [0.7, 1.6, 2.3, 2.9, 2.3, 1.9, 3.8],
    8.5,
)
par(
    "DHCP lo atiende pfSense en cada VLAN (UDP 67/68 se permite automáticamente al activar el servidor DHCP). El ESP32 "
    "tiene una reserva por MAC para que la regla 9 pueda usar su IP fija."
)
h2("8.4 Cómo se limita el acceso de los dispositivos IoT")
vineta("Red propia (VLAN 30) y SSID propio con WPA2: un ESP32 nunca comparte segmento con teléfonos o PC.")
vineta("Una sola regla de salida: TCP 1883 hacia el servidor. Todo lo demás se bloquea, incluido Internet, así que un dispositivo comprometido no puede descargar nada ni atacar otros equipos.")
vineta("En el broker, cada ESP32 tiene usuario y clave propios y sólo puede leer sus órdenes y publicar sus confirmaciones (sección 5.5).")
vineta("Mejora siguiente: MQTT sobre TLS (puerto 8883) con certificado del servidor, para cifrar las claves MQTT en el Wi-Fi.")
h2("8.5 Pruebas de tráfico permitido y denegado")
par(
    "Se ejecutan desde una máquina de cada VLAN (en el laboratorio de VirtualBox, una VM por segmento). nc -zv prueba si "
    "un puerto TCP está abierto; el log del firewall de pfSense (Status → System Logs → Firewall) debe mostrar los bloqueos."
)
tabla(
    "Pruebas de red",
    ["ID", "Desde", "Comando", "Esperado", "Resultado"],
    [
        ["RED-01", "Teléfono (VLAN 20)", "curl -k https://192.168.10.10/api/health", "200 {\"status\":\"ok\"}", "Pendiente"],
        ["RED-02", "Teléfono (VLAN 20)", "nc -zv 192.168.10.10 5432", "Bloqueado (timeout)", "Pendiente"],
        ["RED-03", "Teléfono (VLAN 20)", "nc -zv 192.168.10.10 1883", "Bloqueado", "Pendiente"],
        ["RED-04", "Teléfono (VLAN 20)", "ping 192.168.30.40", "Sin respuesta + log de bloqueo", "Pendiente"],
        ["RED-05", "IoT (VLAN 30)", "nc -zv 192.168.10.10 1883", "Conecta", "Pendiente"],
        ["RED-06", "IoT (VLAN 30)", "nc -zv 192.168.10.10 443", "Bloqueado", "Pendiente"],
        ["RED-07", "IoT (VLAN 30)", "ping 8.8.8.8", "Sin respuesta (sin Internet)", "Pendiente"],
        ["RED-08", "Teléfono (VLAN 20)", "curl -k https://192.168.20.1", "Bloqueado (no administra pfSense)", "Pendiente"],
        ["RED-09", "Oficina (VLAN 10)", "ssh usuario@192.168.10.10", "Conecta", "Pendiente"],
    ],
    [1.5, 3, 5, 4.4, 1.6],
    8.5,
)
par(
    "Estas pruebas quedan pendientes de ejecutar en el laboratorio virtual (Anexo A.6 explica cómo armarlo). Al hacerlo "
    "se completa la columna Resultado con capturas de la terminal y del log de pfSense."
)

# =====================================================================================
h1("9. Pruebas de la API REST y persistencia")
par(
    f"Las pruebas de esta sección se ejecutaron el {fecha_pruebas} sobre la web en **modo producción** (next start) en el "
    "PC del grupo, con los datos de ejemplo (3 usuarios, 61 ubicaciones, 30 productos). Son reproducibles con un comando "
    "(Anexo A.5). Cada prueba envía una petición HTTP real y compara el código de respuesta y el JSON con lo esperado."
)
h2("9.1 Pruebas GET y POST")
par(
    "Los endpoints probados son GET /api/v1/stock (stock por SKU), POST /api/v1/orders (crea un pedido, que compromete "
    "stock) y GET /api/v1/orders/:código (estado de un pedido). En este sistema el inventario no se descuenta al crear el "
    "pedido sino cuando el operador lo recoge en la bodega. Por eso el POST «compromete» unidades (API-09) y el descuento "
    "físico queda protegido por las reglas de la sección 6."
)
tabla(f"Pruebas funcionales de la API ({resumen(api_ev)[0]} OK)", ["ID", "Prueba y petición", "Esperado", "Obtenido", "Resultado"], api_f, [1.6, 4.8, 2.8, 5.4, 1.5], 8)
par("**Qué ocurre ante errores:**")
vineta("401: falta la API key, es inventada o está revocada. No se revela cuál de los tres casos es.")
vineta("400: el cuerpo no es JSON o falta un parámetro obligatorio.")
vineta("422: el JSON es válido pero los datos no (cantidad 0, negativa, decimal o de texto, SKU inexistente, falta un campo). La respuesta indica qué campo falló.")
vineta("404: el pedido no existe. 500: error inesperado, con mensaje genérico (el detalle queda sólo en el log del servidor).")
vineta("Pedir más de lo disponible (API-18) se acepta como pedido pendiente, pero el stock físico no cambia y el disponible se informa en 0, nunca negativo (API-19). Al armar la ola, las unidades que falten quedan marcadas como faltante.")
h2("9.2 Persistencia después de reiniciar el servicio")
par(
    "Se detuvo la web, se volvió a iniciar y se consultaron los pedidos creados en la prueba anterior, por la API y "
    "directamente en PostgreSQL. Siguen ahí, con las mismas líneas y con origen «API»."
)
tabla(f"Pruebas de persistencia ({resumen(per_ev)[0]} OK)", ["ID", "Prueba", "Esperado", "Obtenido", "Resultado"], per_f, [2.2, 4.3, 2.8, 5, 1.5], 8)
h2("9.3 Flujo completo de un pedido")
par(
    "El flujo completo de un pedido de Mercado Libre (PED-006344, olla de greda en A-02-06-03) se ejecutó de forma "
    "automática con Playwright sobre la aplicación real: crear la ola → picking con el teléfono (escaneo de ubicación y de "
    "producto) → separar en la mesa → empacar con verificación → imprimir la etiqueta → despachar. La ejecución se grabó "
    "en el video de demostración (VManque-WMS-demo-narrado.mp4, unos 2 minutos y 20 segundos)."
)
h2("9.4 Resumen de pruebas")
suites = [
    ["API REST (GET/POST, errores)", resumen(api_ev)[0], "iot-lab/pruebas/api.mjs"],
    ["Persistencia tras reinicio", resumen(per_ev)[0], "iot-lab/pruebas/api.mjs persistencia"],
    ["Integridad de PostgreSQL", resumen(int_ev)[0], "iot-lab/pruebas/integridad.mjs"],
    ["Autenticación y roles (navegador)", resumen(rol_ev)[0], "iot-lab/pruebas/roles.mjs"],
    ["Sesión, CORS y modo producción", resumen(seg_ev)[0], "iot-lab/pruebas/seguridad.mjs"],
    ["Seguridad del broker MQTT", resumen(mqtt_ev)[0], "iot-lab/pruebas/mqtt.mjs"],
    ["Pick-to-light con ESP32 emulado", resumen(iot_ev)[0] if iot_ev else "Pendiente", "iot-lab/localizador.mjs + Wokwi VS Code"],
    ["Reglas de pfSense", "Pendiente", "Laboratorio VirtualBox (Anexo A.6)"],
    ["Pick-to-light con hardware físico", "Pendiente", "Requiere ESP32 y tira WS2812B"],
]
tabla("Resumen de las pruebas", ["Grupo de pruebas", "Resultado", "Cómo se repite"], suites, [6, 3, 6.5])

# =====================================================================================
h1("10. Puesta en producción del servidor")
par(
    "El plan de mejoras observó que en la Fase 2.5 Flask corría con Debug activado. El equivalente en esta arquitectura es "
    "el modo desarrollo de Next.js (next dev), que muestra errores detallados y recarga el código en caliente. Ese modo "
    "se usa sólo en el PC de desarrollo. La entrega corre en modo producción:"
)
tabla(
    "Modo desarrollo vs. modo producción",
    ["Aspecto", "Desarrollo (next dev)", "Producción (next start)"],
    [
        ["Errores", "Pantalla con detalle y stack trace", "Mensaje genérico; el detalle sólo en el log (pruebas PROD-01 y PROD-02)"],
        ["Código", "Se recompila al guardar", "Compilado y optimizado una vez (next build)"],
        ["Cookie de sesión", "Sin Secure (http://localhost)", "Secure: sólo viaja por HTTPS (prueba AUT-04)"],
        ["Usuario del proceso", "El del desarrollador", "Usuario sin privilegios «node» dentro del contenedor"],
    ],
    [3.2, 5.5, 6.8],
)
par("**Cómo se inicia el servicio de forma controlada:**")
vineta("La aplicación se empaqueta en una imagen Docker. Al arrancar aplica las migraciones pendientes (prisma migrate deploy) y luego inicia next start en el puerto 3000.")
vineta("Coolify (o Docker en el servidor Ubuntu) reinicia el contenedor si se cae y revisa su salud cada 10 segundos en /api/health. Si no responde, no le envía tráfico.")
vineta("Un proxy inverso con HTTPS (Traefik en Coolify) recibe las conexiones en el puerto 443 y las pasa a la aplicación. El puerto 3000 no se expone a la red.")
par("**Errores y registros:** los errores inesperados se escriben en la salida del contenedor (docker logs o el panel de Coolify), con fecha. Al usuario sólo le llega un mensaje genérico. Los movimientos de stock y los eventos de cada pedido quedan además en la base de datos como auditoría.")
par("**Condiciones mínimas para desplegar fuera del entorno de pruebas:**")
vineta("HTTPS con certificado válido; SESSION_SECRET aleatorio de 32 o más caracteres; DATABASE_URL con un usuario propio de la aplicación (no el superusuario).")
vineta("PostgreSQL sólo accesible desde el servidor y respaldo diario con pg_dump guardado fuera del servidor.")
vineta("Reglas de pfSense de la sección 8 activas y broker MQTT con usuarios por dispositivo.")
vineta("Usuarios de ejemplo del seed eliminados o con contraseñas cambiadas.")

# =====================================================================================
h1("11. Metodología, cronograma y criterios de aceptación")
par("El trabajo se organizó en actividades verificables. Cada una tiene responsable, fecha comprometida, estado y la evidencia que la respalda.")
tabla(
    "Cronograma de actividades",
    ["#", "Actividad", "Responsable", "Fecha", "Estado", "Evidencia"],
    [
        ["1", "Decisión de arquitectura (web) y actualización del informe", "Felipe Schulz y Vicente Manque", "06-11-2026", "Implementado y probado", "Sección 3"],
        ["2", "Aplicación web: pedidos, olas, picking, inventario, despacho", "Vicente Manque", "06-11-2026", "Implementado y probado", "Secciones 4 y 9.3, video"],
        ["3", "Pruebas de API, errores y persistencia", "Vicente Manque", "18-11-2026", "Implementado y probado", "Sección 9"],
        ["4", "Integridad de la base de datos", "Vicente Manque", "18-11-2026", "Implementado y probado", "Sección 6"],
        ["5", "Autenticación, roles, CORS y modo producción", "Felipe Schulz", "18-11-2026", "Implementado y probado", "Secciones 7 y 10"],
        ["6", "Broker MQTT con usuarios y permisos por tema", "Felipe Schulz", "18-11-2026", "Implementado y probado", "Sección 5.5"],
        ["7", "Firmware ESP32 y localizador con confirmación (ack)", "Vicente Manque", "18-11-2026", "Implementado y probado" if iot_ev else "Parcial: falta correr IOT-01 a IOT-07", "Sección 5.6"],
        ["8", "Laboratorio pfSense en VirtualBox y pruebas RED", "Felipe Schulz", "21-11-2026", "Pendiente", "Sección 8.5"],
        ["9", "Montaje físico ESP32 + tira y prueba con foto/video", "Felipe Schulz y Vicente Manque", "Sujeto a compra del hardware", "Pendiente", "Tabla IOT"],
        ["10", "Presentación final y ensayo de la defensa", "Felipe Schulz y Vicente Manque", "22-11-2026", "Pendiente", "Anexo B"],
    ],
    [0.6, 5, 2.8, 2.2, 2.6, 2.3],
    8.5,
)
tabla(
    "Criterios de aceptación medibles",
    ["Componente", "Criterio de aceptación", "Estado"],
    [
        ["Infraestructura", "Las 3 VLAN entregan IP por DHCP y las 9 pruebas RED dan el resultado esperado", "Pendiente"],
        ["API", "Las 21 pruebas de API y las 3 de persistencia pasan", f"{resumen(api_ev)[0]} y {resumen(per_ev)[0]}"],
        ["Base de datos", "Las 12 pruebas de integridad pasan; nunca hay stock negativo", resumen(int_ev)[0]],
        ["Interfaz", "Un operador completa un pedido de punta a punta desde el teléfono", "OK (video)"],
        ["Seguridad", "Pruebas de roles, sesión, CORS y MQTT pasan; contraseñas y keys sólo como hash", f"{resumen(rol_ev)[0]}, {resumen(seg_ev)[0]}, {resumen(mqtt_ev)[0]}"],
        ["ESP32 (emulado)", "Para 3 productos en posiciones distintas, el ack del ESP32 coincide con la tira y píxeles esperados", resumen(iot_ev)[0] if iot_ev else "Pendiente"],
        ["LED físico", "Misma prueba con hardware, con foto/video de cada casilla encendida", "Pendiente"],
    ],
    [3, 9.3, 3.2],
)
h2("11.1 Matriz de estado")
tabla(
    "Estado por componente",
    ["Componente", "Estado", "Comentario"],
    [
        ["Aplicación web (oficina y teléfono)", "Implementado y probado", "En producción en Coolify; video del flujo completo"],
        ["API REST", "Implementado y probado", "21/21 + persistencia"],
        ["Base de datos e integridad", "Implementado y probado", "Restricciones en la propia base"],
        ["Seguridad de la aplicación", "Implementado y probado", "bcrypt, JWT httpOnly, roles, CORS cerrado"],
        ["Broker MQTT y permisos", "Implementado y probado", "En el laboratorio; en el servidor se replica con Mosquitto"],
        ["Integración IoT (ESP32 emulado)", "Implementado y probado" if iot_ev else "Parcial: código listo, falta ejecutar en Wokwi VS Code", "Mismo firmware que la placa"],
        ["Segmentación pfSense", "Parcial: diseño y reglas definidos", "Falta configurar y ejecutar RED-01 a RED-09"],
        ["LED físico", "Pendiente", "Requiere comprar ESP32 y tira WS2812B"],
    ],
    [5, 4.5, 6],
)
par(
    "**Avance según resultados demostrados:** 6 de 9 componentes están implementados y probados con evidencia "
    "reproducible (≈ 70 %). La integración IoT tiene el código terminado y probado hasta el broker, pero falta la "
    "ejecución con el ESP32 emulado; la red segmentada tiene diseño, direcciones y reglas, pero falta la prueba; y el LED "
    "físico depende del hardware. Por eso el avance no se informa como 100 %."
)

# =====================================================================================
h1("12. Conclusiones y próximos pasos")
par(
    "El proyecto pasó de dos alternativas en evaluación a una arquitectura definitiva: una aplicación web de gestión de "
    "bodega que corre sobre la misma infraestructura pfSense + Ubuntu de la Fase 2.5. En software, el sistema funciona de "
    "punta a punta y ahora cada afirmación del informe tiene una prueba reproducible con su resultado esperado y obtenido: "
    "API, persistencia, integridad, roles, sesión, CORS, modo producción y seguridad del broker MQTT."
)
par(
    "En IoT, el aporte de esta etapa es cerrar el ciclo con evidencia del lado del dispositivo: el ESP32 confirma por MQTT "
    "qué píxeles encendió, y el servidor lo compara con lo esperado. Esto se puede ejecutar hoy con el firmware real en un "
    "ESP32 emulado y, sin cambiar el código, con la placa física cuando esté disponible."
)
par("Quedan tres frentes, todos con diseño y criterios de aceptación definidos:")
numerada(1, "Ejecutar las pruebas IOT-01 a IOT-07 con el ESP32 emulado en Wokwi para VS Code y agregar sus capturas.")
numerada(2, "Configurar el laboratorio pfSense con las tres VLAN y las reglas de la sección 8.3, y ejecutar RED-01 a RED-09.")
numerada(3, "Montar el ESP32 y la tira WS2812B físicos y repetir las pruebas IOT con fotos o video de cada casilla encendida.")
par(
    "Como aprendizaje, separar lo demostrado de lo pendiente permitió informar un avance honesto y fácil de defender, y "
    "elegir una arquitectura con criterios explícitos permitió concentrar el esfuerzo en un solo camino, manteniendo el "
    "componente de redes, IoT y seguridad propio de la carrera."
)

# =====================================================================================
salto()
h1("Anexo A. Guía para replicar todo en un PC")
par("Esta guía permite levantar el sistema completo en un PC con Windows para repetir las pruebas y entender el funcionamiento. Cada bloque de comandos se escribe en PowerShell.")
h2("A.1 Programas necesarios")
tabla(
    "Programas para el laboratorio",
    ["Programa", "Para qué", "Cómo se instala"],
    [
        ["Node.js 22", "Ejecutar la web, el broker y las pruebas", "nodejs.org (versión LTS)"],
        ["pnpm", "Instalar dependencias de la web", "npm install -g pnpm"],
        ["PostgreSQL 16", "Base de datos", "postgresql.org, instalador de Windows"],
        ["Git", "Descargar el proyecto", "git-scm.com"],
        ["VS Code", "Editor y simulador Wokwi", "code.visualstudio.com"],
        ["Arduino CLI", "Compilar el firmware del ESP32", "winget install ArduinoSA.CLI"],
        ["Wokwi para VS Code", "Emular el ESP32 y las tiras LED", "code --install-extension wokwi.wokwi-vscode"],
        ["Microsoft Edge", "Pruebas con navegador (ya viene en Windows)", "—"],
    ],
    [3.3, 5.4, 6.8],
)
h2("A.2 Levantar la web en modo producción")
codigo(
    "git clone https://github.com/DiGround-s/VManqueWMS.git\ncd VManqueWMS\npnpm install\n"
    "copy .env.example .env      # editar DATABASE_URL y SESSION_SECRET\n"
    "pnpm db:deploy              # crea las tablas\npnpm db:seed                # datos de ejemplo\n"
    "pnpm build\npnpm start                  # http://localhost:3000"
)
par("Usuarios de ejemplo: admin@vmanque.cl / admin1234 · supervisor@vmanque.cl / super1234 · operador@vmanque.cl / opera1234 (sólo para pruebas locales).")
h2("A.3 Laboratorio IoT: broker y monitor")
par("Abrir dos terminales en la carpeta iot-lab:")
codigo("cd iot-lab\nnpm install\nnode broker.mjs     # terminal 1: broker MQTT en 127.0.0.1:1883\nnode monitor.mjs    # terminal 2: muestra cada mensaje que pasa por el broker")
h2("A.4 ESP32 emulado con el firmware real")
numerada(1, "Instalar Arduino CLI y la extensión de Wokwi (Tabla A.1).")
numerada(2, "En VS Code: F1 → «Wokwi: Request a new License» → iniciar sesión en wokwi.com (cuenta gratuita) → «Get your license». VS Code muestra «License activated».")
numerada(3, "Compilar el firmware (la primera vez descarga el soporte de ESP32, unos minutos):")
codigo("cd iot-lab\\wokwi\n.\\compilar.ps1")
numerada(4, "En VS Code: File → Open Folder → iot-lab\\wokwi. Luego F1 → «Wokwi: Start Simulator». Se ven el ESP32 y las tres tiras. Mantener visible la pestaña del simulador (si se oculta, la simulación se pausa).")
numerada(5, "En el monitor serie deben aparecer «[WiFi] Conectado» y «[MQTT] Conectado · suscrito a vmanque/bc/led/#» (prueba IOT-01). En la terminal del broker aparece «CONECTA usuario=esp32-bc-01».")
numerada(6, "Probar desde una tercera terminal:")
codigo(
    "cd iot-lab\nnode localizador.mjs encender A-02-06-03          # IOT-02\nnode localizador.mjs buscar VM-0021 --seg 30      # IOT-03\n"
    "node localizador.mjs buscar VM-0001 --color blue  # IOT-04\nnode localizador.mjs apagar                       # IOT-05\n"
    "node localizador.mjs picking                      # IOT-06: seguir las olas de la web"
)
par("Cada orden muestra la confirmación del ESP32 («[ESP32] <- ack A-02-06-03: tira A-02, píxeles 132-137») y queda registrada en iot-lab/evidencia/localizaciones.csv con OK o FALLA.")
par("Para el modo picking: en la web, como supervisor, crear una ola (Olas → Nueva ola); en el teléfono (o en /m), como operador, tomar la ola. La casilla de la primera parada se enciende; al escanear la ubicación y el producto, se apaga y se enciende la siguiente.")
h2("A.5 Ejecutar las pruebas")
codigo(
    "cd iot-lab\nnode pruebas/integridad.mjs\nnode pruebas/mqtt.mjs           # con el broker corriendo\n"
    "npm i -D playwright-core\nnode pruebas/roles.mjs          # crea una API key de prueba y guarda capturas\n"
    "$env:VM_KEY = Get-Content evidencia/api-key.txt\nnode pruebas/api.mjs\nnode pruebas/seguridad.mjs\n"
    "# reiniciar la web (Ctrl+C y pnpm start) y luego:\nnode pruebas/api.mjs persistencia"
)
par("Cada prueba imprime una tabla (esperado / obtenido / resultado) y guarda el detalle en iot-lab/evidencia. El informe se regenera con python informe/generar_informe.py.")
h2("A.6 Laboratorio de red con pfSense en VirtualBox")
par("En VirtualBox cada VLAN se representa con una «red interna» distinta (equivale a separar el tráfico en capa 2, igual que una VLAN):")
tabla(
    "Máquinas virtuales del laboratorio de red",
    ["VM", "Adaptadores de red", "IP"],
    [
        ["pfSense", "1: NAT (WAN) · 2: red interna «vlan10» · 3: «vlan20» · 4: «vlan30»", "WAN por DHCP · 192.168.10.1 · 192.168.20.1 · 192.168.30.1"],
        ["Ubuntu Server", "Red interna «vlan10»", "192.168.10.10 estática; corre la web, PostgreSQL y el broker (MQTT_BIND=0.0.0.0)"],
        ["Cliente bodega", "Red interna «vlan20» (por ejemplo Ubuntu o Alpine liviano)", "DHCP 192.168.20.x"],
        ["Cliente IoT", "Red interna «vlan30»; simula al ESP32 para las pruebas de red", "192.168.30.40 (reserva en pfSense)"],
    ],
    [3, 7, 5.5],
)
numerada(1, "Instalar pfSense, asignar las 4 interfaces (WAN, LAN=vlan10, OPT1=vlan20, OPT2=vlan30) con las IP de la Tabla de direccionamiento.")
numerada(2, "Activar el servidor DHCP en cada interfaz y crear la reserva por MAC del cliente IoT.")
numerada(3, "Crear las reglas de la Tabla de reglas en Firewall → Rules, en el orden indicado, con «Log» activado en los bloqueos.")
numerada(4, "En el servidor, dejar PostgreSQL escuchando sólo en 127.0.0.1 (listen_addresses = 'localhost').")
numerada(5, "Ejecutar RED-01 a RED-09 desde cada VM, tomar captura de la terminal y del log de pfSense, y completar la tabla.")
par("En un despliegue real se usan VLAN etiquetadas (802.1Q): pfSense crea las interfaces VLAN 10, 20 y 30 sobre la LAN, el switch lleva el troncal y el access point asocia cada SSID a su VLAN.")

# =====================================================================================
salto()
h1("Anexo B. Guion sugerido para la presentación")
par("Responde a la sección 2 del plan de mejoras. Cada lámina se apoya en una sección y una evidencia de este informe.")
tabla(
    "Láminas y evidencia de respaldo",
    ["#", "Lámina", "Qué mostrar", "Respaldo"],
    [
        ["1", "El problema", "Tiempo perdido buscando productos y errores de ubicación en una bodega con varios canales de venta", "Secc. 1–2"],
        ["2", "La solución en un ejemplo", "VM-0021: se pide → se consulta → se enciende A-02-06-03", "Figura del flujo"],
        ["3", "Decisión: web y no Telegram", "Tabla de comparación por costo, seguridad, uso y escalabilidad", "Secc. 3"],
        ["4", "Arquitectura", "Diagrama con cliente, pfSense, servidor, base, broker, ESP32 y LED; colores implementado / parcial / pendiente", "Secc. 4 y 11.1"],
        ["5", "Demostración", "Web en vivo + ESP32 emulado encendiendo la casilla + confirmación del ack", "Secc. 5.4–5.6"],
        ["6", "Pruebas", "Resumen de pruebas, un caso exitoso y uno de error (API-07 y API-14)", "Secc. 9.4"],
        ["7", "Seguridad", "VLAN, reglas de pfSense, roles, bcrypt, CORS cerrado, permisos MQTT", "Secc. 7–8"],
        ["8", "Estado y próximos pasos", "Matriz de estado, avance real ≈ 70 %, lo que falta y cuándo", "Secc. 11–12"],
    ],
    [0.7, 3.3, 8.2, 3.3],
)
par("**Preguntas técnicas para preparar (ambos integrantes):** ¿dónde quedan guardados los datos y cómo se sabe que persisten? ¿cómo se guardan las contraseñas? ¿qué pasa si un operador intenta una acción de administrador? ¿por qué CORS está cerrado? ¿cómo llega la orden al ESP32 y qué pasa si se cae el Wi-Fi? ¿qué tráfico permite el firewall desde la VLAN IoT y por qué? ¿qué parte es simulación y qué falta para la prueba física?")

# =====================================================================================
h1("Referencias")
for ref in [
    "Netgate. pfSense Documentation: Firewall rules, VLANs y DHCP. https://docs.netgate.com/pfsense/en/latest/",
    "Canonical. Ubuntu Server Documentation. https://ubuntu.com/server/docs",
    "Vercel. Next.js Documentation: Deploying y Production checklist. https://nextjs.org/docs",
    "The PostgreSQL Global Development Group. PostgreSQL 16 Documentation: Constraints y Transactions. https://www.postgresql.org/docs/16/",
    "OASIS. MQTT Version 3.1.1 (2014). https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html",
    "Eclipse Foundation. Mosquitto: autenticación y archivo ACL. https://mosquitto.org/documentation/",
    "Espressif Systems. ESP32 Series Datasheet y Arduino-ESP32. https://docs.espressif.com/projects/arduino-esp32/",
    "Worldsemi. WS2812B Intelligent control LED integrated light source, datasheet.",
    "Wokwi. Documentación de Wokwi para VS Code y ESP32 WiFi. https://docs.wokwi.com/",
    "OWASP. Password Storage Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
    "MDN Web Docs. Cross-Origin Resource Sharing (CORS). https://developer.mozilla.org/es/docs/Web/HTTP/CORS",
    "Jones, M., Bradley, J. y Sakimura, N. (2015). RFC 7519: JSON Web Token (JWT). IETF.",
]:
    vineta(ref)

d.save(SALIDA)
print("Informe generado:", SALIDA, "· figuras nuevas hasta la", nfig[0], "· tablas hasta la", ntab[0])
