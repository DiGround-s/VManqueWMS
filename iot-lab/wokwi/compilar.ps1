# Compila el firmware real del ESP32 para el simulador (requiere Arduino CLI).
# Uso: en PowerShell, dentro de iot-lab\wokwi:  .\compilar.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
node sincronizar.mjs
arduino-cli core update-index
arduino-cli core install esp32:esp32
arduino-cli lib install PubSubClient "Adafruit NeoPixel" ArduinoJson
arduino-cli compile --fqbn esp32:esp32:esp32 --output-dir build sketch
Write-Host "Listo: build\sketch.ino.bin. Ahora en VS Code: F1 -> Wokwi: Start Simulator"
