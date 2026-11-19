"""Pruebas de tráfico permitido y denegado (RED-01 a RED-12) desde cada VLAN del laboratorio.

  python red-lab/pruebas_red.py
Escribe cada comando en la consola de la VM que representa al equipo, espera a que termine y guarda una
captura por VM en red-lab/capturas/red-<vm>.png. Las funciones p (HTTP) y q (puerto TCP) se definen en
preparar_vms.py y aquí.
"""
import time

from vm import captura, tipear

Q = 'q(){ if nc -w 3 $1 $2 </dev/null >/dev/null 2>&1; then echo ">> TCP $1:$2 ABIERTO"; else echo ">> TCP $1:$2 BLOQUEADO"; fi; }'
H = 'h(){ r=$(wget -T 3 -qO- http://$1:$2/api/health 2>&1); [ -n "$r" ] && echo ">> HTTP $1:$2 -> $r"; }'

PRUEBAS = {
    "lab-bodega": ("Telefono de bodega (VLAN 20)", "eth0.20", [
        ("RED-01", "h 192.168.10.10 443", 5),
        ("RED-02", "q 192.168.10.10 5432", 5),
        ("RED-03", "q 192.168.10.10 1883", 5),
        ("RED-04", "ping -c 2 -W 2 192.168.30.40 | tail -2", 6),
        ("RED-08", "q 192.168.20.1 443", 5),
        ("RED-10", "wget -T 6 -qO /dev/null http://example.com && echo '>> Internet HTTP OK'", 8),
    ]),
    "lab-iot": ("ESP32 / IoT (VLAN 30)", "eth0.30", [
        ("RED-05", "q 192.168.10.10 1883", 5),
        ("RED-06", "q 192.168.10.10 443", 5),
        ("RED-07", "ping -c 2 -W 2 8.8.8.8 | tail -2", 6),
        ("RED-11", "q 192.168.20.100 443", 5),
    ]),
    "lab-oficina": ("PC de oficina (VLAN 10)", "eth0.10", [
        ("RED-09", "q 192.168.10.10 22", 5),
        ("RED-12", "q 192.168.10.1 443", 5),
        ("RED-13", "ping -c 2 -W 2 192.168.30.40 | tail -2", 6),
    ]),
}

for vm, (titulo, iface, pruebas) in PRUEBAS.items():
    tipear(vm, Q)
    tipear(vm, H)
    tipear(vm, f"clear; echo '== {titulo} =='; ip addr show {iface} | grep 'inet '")
    time.sleep(1.5)
    for id_, cmd, espera in pruebas:
        tipear(vm, f"echo '--- {id_}: {cmd.split('|')[0].strip()}'; {cmd}")
        time.sleep(espera)
    captura(vm, f"red-lab/capturas/red-{vm.removeprefix('lab-')}.png")
