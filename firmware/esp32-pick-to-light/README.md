# Pick-to-light con ESP32

Firmware para encender el LED de la estantería donde está el producto. Por ahora la app lo **simula** en el mapa 3D (panel «Pick-to-light · ESP32»). Ese panel usa los mismos temas MQTT, los mismos mensajes y el mismo mapeo de píxeles que este código, así que al conectar el hardware real el comportamiento es el mismo.

## Cómo viaja la orden

```
Servidor WMS (VLAN 10) ──MQTT TCP 1883──▶ Broker (Mosquitto) ──▶ ESP32 (VLAN 30 IoT, Wi-Fi) ──▶ tira WS2812B del pasillo
```

- Tema: `vmanque/bc/led/<ubicación>`, por ejemplo `vmanque/bc/led/A-02-06-03`.
- Encender: `{"on":1,"color":"green","blink":1}`. Apagar: `{"on":0}`.
- Hay una tira por pasillo (A-01, A-02, B-01). Cada casilla (rack + nivel) usa 6 píxeles, y el primero es `((rack-1)*4 + (nivel-1)) * 6`. Es el mismo cálculo de `src/features/map/led-mapping.ts`.

## Materiales

- ESP32 DevKit V1 (ESP-WROOM-32).
- Tira WS2812B de 60 LED/m: 2,4 m por pasillo, 144 píxeles.
- Fuente de 5 V. Calcula unos 20 mA por LED encendido a brillo 80/255.
- Resistencia de 330 Ω en la línea de datos y condensador de 1000 µF entre 5 V y GND de la tira.
- Opcional: conversor de nivel 3,3 V → 5 V (74AHCT125) para la señal de datos.

## Conexión

| ESP32 | Tira |
|---|---|
| GPIO 5 | DIN tira pasillo A-01 (a través de 330 Ω) |
| GPIO 18 | DIN tira pasillo A-02 |
| GPIO 19 | DIN tira pasillo B-01 |
| GND | GND de la tira y de la fuente (tierra común) |

La tira se alimenta directo de la fuente de 5 V, no desde el pin de 5 V del ESP32.

## Red

- El ESP32 va en la **VLAN 30 (IoT)** con su propio SSID (`VManque-IoT`, WPA2).
- El firewall sólo permite que esa VLAN hable con el broker (TCP 1883). No tiene salida a Internet ni acceso a las VLAN de oficina o bodega.
- El broker exige usuario y clave por dispositivo. En producción se recomienda MQTT sobre TLS (puerto 8883).

## Cargar el firmware

1. En el IDE de Arduino instala el paquete de placas **esp32** de Espressif y elige «ESP32 Dev Module».
2. Instala las librerías **PubSubClient**, **Adafruit NeoPixel** y **ArduinoJson**.
3. Cambia `WIFI_SSID`, `WIFI_PASS`, `MQTT_HOST` y las claves al inicio del `.ino`.
4. Carga el programa y abre el Monitor serie a 115200 baudios.

Para probar sin la app, puedes publicar a mano:

```bash
mosquitto_pub -h 192.168.10.10 -u servidor -P clave -t vmanque/bc/led/A-02-06-03 -m '{"on":1,"color":"green","blink":1}'
```
