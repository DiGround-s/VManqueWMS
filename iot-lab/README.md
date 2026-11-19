# Laboratorio pick-to-light y pruebas

Todo lo necesario para probar el sistema completo en un PC **sin ESP32 ni tira LED**: el firmware real corre en un ESP32 emulado (Wokwi para VS Code), un broker MQTT local cumple el papel de Mosquitto y un localizador une la base de datos de la web con el ESP32. No modifica la web.

La guía completa, con explicaciones, está en el informe (Anexo A). Aquí va el resumen.

## Piezas

| Archivo | Qué hace |
|---|---|
| `broker.mjs` | Broker MQTT en 127.0.0.1:1883 con usuario/clave y permisos por tema (`servidor`, `esp32-bc-01`, `monitor`). |
| `localizador.mjs` | `buscar SKU`, `encender UBICACIÓN`, `apagar`, `picking`. Lee PostgreSQL (sólo lectura), publica en `vmanque/bc/led/<ubicación>` y espera la confirmación del ESP32 en `vmanque/bc/ack/<ubicación>`. Registra cada resultado en `evidencia/localizaciones.csv`. |
| `monitor.mjs` | Muestra todo lo que pasa por el broker (como `mosquitto_sub -v`). |
| `wokwi/` | Proyecto de Wokwi para VS Code: `diagram.json` (ESP32 + 3 tiras WS2812B de 144 LED), `wokwi.toml` y `compilar.ps1`. `sincronizar.mjs` copia el firmware real agregando sólo `#define WOKWI_LAB`. |
| `pruebas/` | `api.mjs`, `integridad.mjs`, `seguridad.mjs`, `roles.mjs`, `mqtt.mjs`. Imprimen esperado/obtenido y guardan el detalle en `evidencia/` (ignorada por git). |

## Pasos rápidos

```powershell
cd iot-lab
npm install
node broker.mjs        # terminal 1
node monitor.mjs       # terminal 2
```

ESP32 emulado (una vez: `winget install ArduinoSA.CLI` y `code --install-extension wokwi.wokwi-vscode`, luego F1 → «Wokwi: Request a new License»):

```powershell
cd iot-lab\wokwi
.\compilar.ps1
```

Abrir la carpeta `iot-lab\wokwi` en VS Code → F1 → «Wokwi: Start Simulator» (dejar la pestaña visible). Luego:

```powershell
node localizador.mjs buscar VM-0021
node localizador.mjs picking
```

Pruebas (con la web corriendo en http://localhost:3000):

```powershell
node pruebas/integridad.mjs
node pruebas/mqtt.mjs
npm i -D playwright-core; node pruebas/roles.mjs
$env:VM_KEY = Get-Content evidencia/api-key.txt; node pruebas/api.mjs; node pruebas/seguridad.mjs
```

Las claves del broker (`lab-…-clave`) son sólo para el laboratorio local. En el servidor real se definen con `MQTT_PASS_*` y en Mosquitto con `mosquitto_passwd`.
