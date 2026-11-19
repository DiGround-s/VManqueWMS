"""Prepara las VMs Alpine (live, sin disco) del laboratorio: interfaz VLAN 802.1Q, IP y servicios.

  python red-lab/preparar_vms.py
Cada VM etiqueta su tráfico con su VLAN (como un equipo conectado a un puerto de acceso del switch).
"""
import time

from vm import tipear

COMUNES = [
    "root",
    "modprobe 8021q",
    "ip link set eth0 up",
]
# Función de prueba: cada servicio del servidor responde HTTP, así que basta un wget con 3 s de espera.
PRUEBA = 'p(){ if wget -T 3 -qO /dev/null http://$1:$2/api/health 2>/dev/null; then echo ">> $1:$2 ABIERTO"; else echo ">> $1:$2 BLOQUEADO"; fi; }'

VMS = {
    "lab-servidor": [
        "hostname servidor",
        "ip link add link eth0 name eth0.10 type vlan id 10",
        "ip link set eth0.10 up",
        "ip addr add 192.168.10.10/24 dev eth0.10",
        "ip route add default via 192.168.10.1",
        "mkdir -p /www/api && echo '{\"status\":\"ok\"}' > /www/api/health",
        # Servicios del servidor real: web 443, MQTT 1883, PostgreSQL 5432, SSH 22 (aquí, un servicio de prueba en cada puerto).
        "for port in 443 1883 5432 22; do httpd -p $port -h /www; done",
        "clear; hostname; ip -br addr show eth0.10; netstat -ltn",
    ],
    "lab-oficina": ["hostname oficina", "ip link add link eth0 name eth0.10 type vlan id 10", "ip link set eth0.10 up", "udhcpc -i eth0.10 -q", PRUEBA, "clear; hostname; ip -br addr show eth0.10; ip route"],
    "lab-bodega": ["hostname telefono-bodega", "ip link add link eth0 name eth0.20 type vlan id 20", "ip link set eth0.20 up", "udhcpc -i eth0.20 -q", PRUEBA, "clear; hostname; ip -br addr show eth0.20; ip route"],
    "lab-iot": ["hostname esp32-bc-01", "ip link add link eth0 name eth0.30 type vlan id 30", "ip link set eth0.30 up", "udhcpc -i eth0.30 -q", PRUEBA, "clear; hostname; ip -br addr show eth0.30; ip route"],
}

for vm, pasos in VMS.items():
    for paso in COMUNES + pasos:
        tipear(vm, paso)
        time.sleep(4 if paso == "root" or paso.startswith("udhcpc") else 1)
    print("lista:", vm)
