#!/usr/bin/env bash
# paso.sh VM ESPERA teclas...   presiona teclas, espera N s y guarda la captura en red-lab/capturas/actual.png
vm=$1; espera=$2; shift 2
[ $# -gt 0 ] && python red-lab/vm.py teclas "$vm" "$@"
sleep "$espera"
python red-lab/vm.py captura "$vm" red-lab/capturas/actual.png >/dev/null
