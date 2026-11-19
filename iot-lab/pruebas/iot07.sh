#!/usr/bin/env bash
# IOT-07 automático: espera que el ESP32 esté conectado, corta su conexión desde el broker y mide la reconexión.
# Uso: bash pruebas/iot07.sh <archivo-de-log-del-broker>
LOG="$1"
cd "$(dirname "$0")/.."
until grep -q "SUSCRIBE esp32-bc-01" "$LOG"; do sleep 1; done
echo "ESP32 conectado; cortando en 3 s"
sleep 3
antes=$(grep -c "SUSCRIBE esp32-bc-01" "$LOG")
touch evidencia/cortar
for i in $(seq 1 120); do
  [ "$(grep -c "SUSCRIBE esp32-bc-01" "$LOG")" -gt "$antes" ] && break
  sleep 1
done
grep -E "CORTE|esp32-bc-01" "$LOG" | tail -5
node pruebas/iot.mjs reconexion | tail -1
