"""Segunda tanda de pruebas de red (RED-14 a RED-28): DNS, puertos no permitidos, reserva DHCP y evidencia desde pfSense.

  python red-lab/pruebas_red2.py
Igual que pruebas_red.py: escribe los comandos en la consola de cada VM y guarda una captura por grupo en
red-lab/capturas/red2-<grupo>.png. Las funciones q (puerto TCP) y h (HTTP) ya están definidas en cada VM.
Al final entra al shell de pfSense (opción 8) y muestra la tabla de estados, las etiquetas 802.1Q y los contadores por regla.
"""
import time

from vm import captura, tipear

Q = 'q(){ if nc -w 3 $1 $2 </dev/null >/dev/null 2>&1; then echo ">> TCP $1:$2 ABIERTO"; else echo ">> TCP $1:$2 BLOQUEADO"; fi; }'
D = 'd(){ if timeout 6 nslookup $1 $2 >/tmp/ns 2>&1 && grep -q "Address.*[0-9]" /tmp/ns; then echo ">> DNS $2: $1 -> $(grep -A3 Name /tmp/ns | grep Address | head -1)"; else echo ">> DNS $2: SIN RESPUESTA"; fi; }'

PRUEBAS = {
    "lab-bodega": ("Telefono de bodega (VLAN 20)", "eth0.20", [
        ("RED-14", "d example.com 192.168.20.1", 8),
        ("RED-15", "d example.com 8.8.8.8", 8),
        ("RED-16", "q 192.168.10.10 22", 5),
        ("RED-17", "q 1.1.1.1 22", 5),
        ("RED-18", "ip route | head -1", 2),
    ]),
    "lab-iot": ("ESP32 / IoT (VLAN 30)", "eth0.30", [
        ("RED-19", "q 192.168.10.10 5432", 5),
        ("RED-20", "q 192.168.10.10 22", 5),
        ("RED-21", "d example.com 192.168.30.1", 8),
        ("RED-22", "q 192.168.30.1 443", 5),
    ]),
    "lab-oficina": ("PC de oficina (VLAN 10)", "eth0.10", [
        ("RED-23", "d example.com 192.168.10.1", 8),
        ("RED-24", "wget -T 6 -qO /dev/null http://example.com && echo '>> Internet HTTP OK'", 8),
        ("RED-25", "q 192.168.20.100 443", 5),
        ("RED-26", "q 1.1.1.1 22", 5),
    ]),
}

for vm, (titulo, iface, pruebas) in PRUEBAS.items():
    tipear(vm, Q)
    tipear(vm, D)
    tipear(vm, f"clear; echo '== {titulo} =='; ip addr show {iface} | grep 'inet '")
    time.sleep(1.5)
    for id_, cmd, espera in pruebas:
        tipear(vm, f"echo '--- {id_}: {cmd.split('|')[0].split('&&')[0].strip()}'; {cmd}")
        time.sleep(espera)
    captura(vm, f"red-lab/capturas/red2-{vm.removeprefix('lab-')}.png")

# ---------- Evidencia desde pfSense
# Conexión MQTT del ESP32 que se mantiene abierta 90 s, y tráfico continuo en las VLAN 20 y 30 para la captura.
tipear("lab-iot", "clear; (sleep 90 | nc 192.168.10.10 1883 &) ; ping -c 40 192.168.30.1 >/dev/null 2>&1 &")
tipear("lab-bodega", "clear; ping -c 40 192.168.20.1 >/dev/null 2>&1 &")
time.sleep(3)
tipear("lab-pfsense", "8")  # Shell
time.sleep(3)
tipear("lab-pfsense", "clear; echo '--- RED-27: pfctl -ss | grep 1883'; pfctl -ss | grep 1883")
time.sleep(3)
captura("lab-pfsense", "red-lab/capturas/red2-pf-estados.png")
tipear("lab-pfsense", "clear; echo '--- RED-28: tcpdump -e -n -c 6 -i em1 vlan'; tcpdump -e -n -c 6 -i em1 vlan 2>/dev/null")
time.sleep(8)
captura("lab-pfsense", "red-lab/capturas/red2-pf-vlan.png")
tipear("lab-pfsense", "clear; echo '--- RED-29: pfctl -vvsr (contadores R8, R10, R11)'; pfctl -vvsr | grep -A1 -E 'R(8|10|11) ' | grep -E 'USER_RULE|Evaluations' | sed -e 's/label \"id.*//' -e 's/ridentifier.*//'")
time.sleep(4)
captura("lab-pfsense", "red-lab/capturas/red2-pf-contadores.png")
tipear("lab-pfsense", "exit")
