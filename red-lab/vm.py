"""Ayudante para manejar las VMs del laboratorio de red desde la consola (VBoxManage).

  python red-lab/vm.py tipear lab-bodega "udhcpc -i eth0.20"     # escribe y presiona Enter
  python red-lab/vm.py teclas lab-pfsense enter abajo           # teclas especiales
  python red-lab/vm.py captura lab-bodega red-lab/capturas/x.png  # captura de la pantalla de la VM
"""
import subprocess
import sys
import time

VB = r"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
SCAN = {  # código de pulsación y liberación (teclado PC)
    "enter": "1c 9c",
    "esc": "01 81",
    "tab": "0f 8f",
    "espacio": "39 b9",
    "arriba": "e0 48 e0 c8",
    "abajo": "e0 50 e0 d0",
    "izquierda": "e0 4b e0 cb",
    "derecha": "e0 4d e0 cd",
    "y": "15 95",
    "n": "31 b1",
}


def vbox(*args):
    return subprocess.run([VB, *args], capture_output=True, text=True)


def teclas(vm, *nombres):
    for n in nombres:
        vbox("controlvm", vm, "keyboardputscancode", *SCAN[n].split())
        time.sleep(0.25)


def tipear(vm, texto, enter=True):
    # VBoxManage escribe con distribución de teclado US; se envía en trozos cortos para no perder teclas.
    for i in range(0, len(texto), 40):
        vbox("controlvm", vm, "keyboardputstring", texto[i : i + 40])
        time.sleep(0.15)
    if enter:
        teclas(vm, "enter")


def captura(vm, archivo):
    r = vbox("controlvm", vm, "screenshotpng", archivo)
    print(r.stdout or r.stderr or archivo)


if __name__ == "__main__":
    cmd, vm, *resto = sys.argv[1:]
    if cmd == "tipear":
        tipear(vm, " ".join(resto))
    elif cmd == "escribir":
        tipear(vm, " ".join(resto), enter=False)
    elif cmd == "teclas":
        teclas(vm, *resto)
    elif cmd == "captura":
        captura(vm, resto[0])
