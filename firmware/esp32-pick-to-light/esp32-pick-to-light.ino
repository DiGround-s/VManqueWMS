/*
 * VManque WMS · Pick-to-light para ESP32
 *
 * Se conecta al Wi-Fi de la VLAN IoT, se suscribe por MQTT a vmanque/bc/led/#
 * y enciende en la tira WS2812B del pasillo los píxeles de la ubicación recibida.
 *
 *   Tema:    vmanque/bc/led/A-02-06-03
 *   Mensaje: {"on":1,"color":"green","blink":1}   ó   {"on":0}
 *
 * El mapeo ubicación → píxeles es el mismo de src/features/map/led-mapping.ts.
 *
 * Librerías (Gestor de librerías del IDE de Arduino):
 *   - PubSubClient (Nick O'Leary)
 *   - Adafruit NeoPixel
 *   - ArduinoJson (v7)
 * Placa: "ESP32 Dev Module" (paquete esp32 de Espressif).
 */
#include <WiFi.h>
#include <PubSubClient.h>
#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>

// ---- Red (cambia estos valores) ----
const char* WIFI_SSID = "VManque-IoT";
const char* WIFI_PASS = "cambia-esta-clave";
const char* MQTT_HOST = "192.168.10.10";
const uint16_t MQTT_PORT = 1883;
const char* MQTT_USER = "esp32-bc-01";
const char* MQTT_PASS = "cambia-esta-clave";
const char* CLIENT_ID = "esp32-bc-01";
const char* TOPIC = "vmanque/bc/led/#";

// ---- Tiras: una por pasillo, cada una en su GPIO ----
const uint8_t LEDS_PER_SLOT = 6;
const uint8_t LEVELS_PER_RACK = 4;
const uint8_t RACKS_PER_ROW = 6;
const uint16_t PIXELS_PER_STRIP = RACKS_PER_ROW * LEVELS_PER_RACK * LEDS_PER_SLOT;  // 144

struct Strip { const char* row; uint8_t pin; Adafruit_NeoPixel* px; };
Adafruit_NeoPixel s0(PIXELS_PER_STRIP, 5, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel s1(PIXELS_PER_STRIP, 18, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel s2(PIXELS_PER_STRIP, 19, NEO_GRB + NEO_KHZ800);
Strip strips[] = { { "A-01", 5, &s0 }, { "A-02", 18, &s1 }, { "B-01", 19, &s2 } };
const uint8_t STRIP_COUNT = sizeof(strips) / sizeof(strips[0]);

// Píxeles que deben parpadear (hasta 32 ubicaciones encendidas a la vez).
struct Lit { int8_t strip; uint16_t first; uint32_t color; bool blink; };
Lit lit[32];
uint8_t litCount = 0;

WiFiClient net;
PubSubClient mqtt(net);
const uint8_t STATUS_LED = 2;  // LED azul de la placa: destella con cada mensaje

int8_t stripFor(const String& row) {
  for (uint8_t i = 0; i < STRIP_COUNT; i++) if (row == strips[i].row) return i;
  return -1;
}

// "A-02-06-03" → tira "A-02", primer píxel ((rack-1)*4 + (nivel-1)) * 6
bool parseLocation(const String& code, int8_t& strip, uint16_t& first) {
  int a = code.indexOf('-'), b = code.indexOf('-', a + 1), c = code.indexOf('-', b + 1);
  if (a < 0 || b < 0 || c < 0) return false;
  strip = stripFor(code.substring(0, b));
  int rack = code.substring(b + 1, c).toInt();
  int level = code.substring(c + 1).toInt();
  if (strip < 0 || rack < 1 || rack > RACKS_PER_ROW || level < 1 || level > LEVELS_PER_RACK) return false;
  first = ((rack - 1) * LEVELS_PER_RACK + (level - 1)) * LEDS_PER_SLOT;
  return true;
}

uint32_t colorFor(Adafruit_NeoPixel* px, const char* name) {
  if (!strcmp(name, "red")) return px->Color(255, 30, 30);
  if (!strcmp(name, "blue")) return px->Color(40, 110, 255);
  if (!strcmp(name, "yellow")) return px->Color(255, 190, 0);
  return px->Color(0, 255, 110);  // green
}

void paint(int8_t strip, uint16_t first, uint32_t color) {
  Adafruit_NeoPixel* px = strips[strip].px;
  for (uint8_t i = 0; i < LEDS_PER_SLOT; i++) px->setPixelColor(first + i, color);
  px->show();
}

void forget(int8_t strip, uint16_t first) {
  for (uint8_t i = 0; i < litCount; i++)
    if (lit[i].strip == strip && lit[i].first == first) { lit[i] = lit[--litCount]; return; }
}

void onMessage(char* topic, byte* payload, unsigned int len) {
  digitalWrite(STATUS_LED, HIGH);
  String code = String(topic).substring(String(topic).lastIndexOf('/') + 1);
  JsonDocument doc;
  if (deserializeJson(doc, payload, len)) { Serial.println("[MQTT] JSON inválido"); return; }
  int8_t strip; uint16_t first;
  if (!parseLocation(code, strip, first)) { Serial.printf("[LED]  Ubicación sin tira: %s\n", code.c_str()); return; }

  bool on = doc["on"] | 0;
  Serial.printf("[MQTT] <- %s %s\n", topic, on ? "on" : "off");
  forget(strip, first);
  if (on) {
    uint32_t color = colorFor(strips[strip].px, doc["color"] | "green");
    paint(strip, first, color);
    if (litCount < 32) lit[litCount++] = { strip, first, color, (bool)(doc["blink"] | 0) };
    Serial.printf("[LED]  Tira %s · píxeles %u-%u -> encendido\n", strips[strip].row, first, first + LEDS_PER_SLOT - 1);
  } else {
    paint(strip, first, 0);
    Serial.printf("[LED]  Tira %s · píxeles %u-%u -> apagado\n", strips[strip].row, first, first + LEDS_PER_SLOT - 1);
  }
}

void connectWifi() {
  Serial.printf("[WiFi] Conectando a SSID \"%s\"...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(400); Serial.print("."); }
  Serial.printf("\n[WiFi] Conectado · IP %s · GW %s · RSSI %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.gatewayIP().toString().c_str(), WiFi.RSSI());
}

void connectMqtt() {
  while (!mqtt.connected()) {
    Serial.printf("[MQTT] Conectando a %s:%u como %s...\n", MQTT_HOST, MQTT_PORT, CLIENT_ID);
    if (mqtt.connect(CLIENT_ID, MQTT_USER, MQTT_PASS)) {
      mqtt.subscribe(TOPIC, 1);
      Serial.printf("[MQTT] Conectado · suscrito a %s (QoS 1)\n", TOPIC);
    } else {
      Serial.printf("[MQTT] Falló (estado %d), reintento en 3 s\n", mqtt.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(STATUS_LED, OUTPUT);
  for (uint8_t i = 0; i < STRIP_COUNT; i++) { strips[i].px->begin(); strips[i].px->setBrightness(80); strips[i].px->show(); }
  Serial.printf("[LED]  %u tiras WS2812B · %u píxeles c/u\n", STRIP_COUNT, PIXELS_PER_STRIP);
  connectWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  connectMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  // Parpadeo a ~1 Hz de las ubicaciones con "blink":1.
  static uint32_t last = 0;
  static bool phase = true;
  if (millis() - last > 450) {
    last = millis();
    phase = !phase;
    for (uint8_t i = 0; i < litCount; i++)
      if (lit[i].blink) paint(lit[i].strip, lit[i].first, phase ? lit[i].color : 0);
    digitalWrite(STATUS_LED, LOW);
  }
}
