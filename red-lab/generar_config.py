"""Genera red-lab/config-lab.xml (configuración del laboratorio) a partir del config.xml original de pfSense.

VLAN 802.1Q sobre el troncal em1, una interfaz y un servidor DHCP por VLAN, alias y reglas del firewall
(la matriz de reglas del informe). Uso: python red-lab/generar_config.py
"""
import os
import xml.etree.ElementTree as ET

AQUI = os.path.dirname(os.path.abspath(__file__))
arbol = ET.parse(os.path.join(AQUI, "config-original.xml"))
raiz = arbol.getroot()


def nodo(padre, etiqueta, texto=None, **hijos):
    e = ET.SubElement(padre, etiqueta)
    if texto is not None:
        e.text = texto
    for k, v in hijos.items():
        ET.SubElement(e, k).text = v
    return e


def reemplazar(etiqueta):
    viejo = raiz.find(etiqueta)
    pos = list(raiz).index(viejo)
    raiz.remove(viejo)
    nuevo = ET.Element(etiqueta)
    raiz.insert(pos, nuevo)
    return nuevo


# --- VLAN 802.1Q sobre em1 (enlace troncal hacia el switch) ---
vlans = reemplazar("vlans")
VLANS = [("10", "Servidores y oficina"), ("20", "Bodega Wi-Fi"), ("30", "IoT pick-to-light")]
for tag, descr in VLANS:
    nodo(vlans, "vlan", **{"if": "em1", "tag": tag, "pcp": "", "descr": descr, "vlanif": f"em1.{tag}"})

# --- Interfaces ---
ifs = raiz.find("interfaces")
wan = ifs.find("wan")
# SÓLO LABORATORIO: la WAN es la red privada del NAT de VirtualBox (10.0.2.0/24), así que se quitan
# «Block private networks» y «Block bogon networks». En producción, con IP pública, van activadas.
for e in ("blockpriv", "blockbogons"):
    if wan.find(e) is not None:
        wan.remove(wan.find(e))
for e in ("ipaddrv6", "dhcp6-ia-pd-len"):  # el laboratorio usa sólo IPv4
    if wan.find(e) is not None:
        wan.find(e).text = ""
ifs.remove(ifs.find("lan"))
for clave, tag, nombre in (("lan", "10", "VLAN10_SERVIDORES"), ("opt1", "20", "VLAN20_BODEGA"), ("opt2", "30", "VLAN30_IOT")):
    i = nodo(ifs, clave)
    ET.SubElement(i, "enable")
    nodo(i, "descr", nombre)
    nodo(i, "if", f"em1.{tag}")
    nodo(i, "ipaddr", f"192.168.{tag}.1")
    nodo(i, "subnet", "24")
    nodo(i, "spoofmac", "")

# --- DHCP por VLAN ---
dhcpd = reemplazar("dhcpd")
for clave, tag in (("lan", "10"), ("opt1", "20"), ("opt2", "30")):
    d = nodo(dhcpd, clave)
    ET.SubElement(d, "enable")
    rango = nodo(d, "range")
    nodo(rango, "from", f"192.168.{tag}.100")
    nodo(rango, "to", f"192.168.{tag}.199")
    if tag == "30":  # reserva por MAC para el ESP32: la regla del firewall usa su IP fija
        nodo(d, "staticmap", mac="08:00:27:bb:00:40", ipaddr="192.168.30.40", hostname="esp32-bc-01", descr="ESP32 pick-to-light")
reemplazar("dhcpdv6")

# --- Alias ---
aliases = reemplazar("aliases")
nodo(aliases, "alias", name="RFC1918", type="network", address="10.0.0.0/8 172.16.0.0/12 192.168.0.0/16", descr="Redes privadas", detail="Clase A||Clase B||Clase C")
nodo(aliases, "alias", name="SERVIDOR_WMS", type="host", address="192.168.10.10", descr="Servidor Ubuntu: web, PostgreSQL, Mosquitto", detail="Servidor")
nodo(aliases, "alias", name="ESP32", type="host", address="192.168.30.40", descr="ESP32 pick-to-light (reserva DHCP)", detail="esp32-bc-01")
nodo(aliases, "alias", name="WEB", type="port", address="80 443", descr="HTTP y HTTPS", detail="HTTP||HTTPS")

# --- Reglas (se evalúan de arriba hacia abajo en la interfaz de entrada; gana la primera que coincide) ---
filtro = reemplazar("filter")
n = [0]


def regla(n_doc, tipo, interfaz, origen, destino, protocolo=None, puerto=None, descr="", log=False, no_destino=False):
    n[0] += 1
    r = nodo(filtro, "rule")
    nodo(r, "id", "")
    nodo(r, "tracker", str(1800000000 + n[0]))
    nodo(r, "type", tipo)
    nodo(r, "interface", interfaz)
    nodo(r, "ipprotocol", "inet")
    if protocolo:
        nodo(r, "protocol", protocolo)
    s = nodo(r, "source")
    if origen.endswith("net") or origen == "(self)":
        nodo(s, "network", origen if origen == "(self)" else origen[:-3])
    else:
        nodo(s, "address", origen)
    d = nodo(r, "destination")
    if destino == "any":
        ET.SubElement(d, "any")
    elif destino.endswith("net") or destino == "(self)":
        nodo(d, "network", destino if destino == "(self)" else destino[:-3])
    else:
        nodo(d, "address", destino)
    if no_destino:
        ET.SubElement(d, "not")
    if puerto:
        nodo(d, "port", puerto)
    if log:
        ET.SubElement(r, "log")
    nodo(r, "descr", f"R{n_doc} {descr}")


# VLAN 10 (lan): servidores y oficina
regla(1, "pass", "lan", "lannet", "(self)", "tcp", "443", "Administrar pfSense solo desde oficina")
regla(2, "pass", "lan", "lannet", "(self)", "udp", "53", "DNS del propio pfSense")
regla(3, "block", "lan", "lannet", "opt1net", descr="Servidor/oficina no abren conexiones hacia telefonos", log=True)
regla(4, "block", "lan", "lannet", "opt2net", descr="Servidor/oficina no abren conexiones hacia IoT", log=True)
regla(5, "pass", "lan", "lannet", "RFC1918", "tcp", "WEB", "Actualizaciones e Internet (HTTP/HTTPS)", no_destino=True)
# VLAN 20 (opt1): teléfonos de bodega
regla(6, "pass", "opt1", "opt1net", "SERVIDOR_WMS", "tcp", "443", "Telefonos usan la web (modo bodega)")
regla(7, "pass", "opt1", "opt1net", "(self)", "udp", "53", "DNS del propio pfSense")
regla(8, "block", "opt1", "opt1net", "RFC1918", descr="Sin acceso a otras VLAN ni a la administracion de pfSense", log=True)
regla(9, "pass", "opt1", "opt1net", "RFC1918", "tcp", "WEB", "Navegacion basica de los telefonos", no_destino=True)
# VLAN 30 (opt2): IoT
regla(10, "pass", "opt2", "ESP32", "SERVIDOR_WMS", "tcp", "1883", "ESP32 -> broker MQTT (unica necesidad)")
regla(11, "block", "opt2", "opt2net", "any", descr="IoT aislado: sin Internet ni otras VLAN", log=True)
# WAN: sin reglas de paso → pfSense bloquea todo lo que entra desde Internet (regla por defecto).
# SÓLO LABORATORIO: el PC anfitrión (10.0.2.2 en el NAT de VirtualBox) abre el panel web para tomar capturas.
regla(0, "pass", "wan", "10.0.2.2", "(self)", "tcp", "443", "LAB: panel web desde el PC anfitrion (no va en produccion)")
webgui = raiz.find("system/webgui")
for opcion in ("nodnsrebindcheck", "nohttpreferercheck"):  # se entra como https://127.0.0.1:8443 (reenvío de VirtualBox)
    if webgui.find(opcion) is None:
        ET.SubElement(webgui, opcion)

desc = raiz.find("revision/description")
if desc is not None:
    desc.text = "Laboratorio VManque: VLAN 10/20/30, DHCP y reglas del informe"
ET.indent(arbol, "\t")
arbol.write(os.path.join(AQUI, "config-lab.xml"), encoding="utf-8", xml_declaration=True)
print("config-lab.xml generado:", n[0], "reglas")
