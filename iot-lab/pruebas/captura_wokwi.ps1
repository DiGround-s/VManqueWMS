# Enciende casillas en las tres tiras del ESP32 emulado y captura la pantalla completa (VS Code al frente).
#   powershell -File iot-lab\pruebas\captura_wokwi.ps1 [-Espera 20]
param([int]$Espera = 20)
$ErrorActionPreference = "Stop"
$lab = Split-Path $PSScriptRoot -Parent
$salida = Join-Path (Split-Path $lab -Parent) "informe\img"
New-Item -ItemType Directory -Force $salida | Out-Null
Add-Type -AssemblyName System.Windows.Forms, System.Drawing

function Capturar($nombre) {
  $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
  $bmp.Save((Join-Path $salida $nombre), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "captura: $nombre"
}

Write-Host "Tienes $Espera s para dejar VS Code con el simulador al frente..."
Start-Sleep -Seconds $Espera
Push-Location $lab
node localizador.mjs apagar | Out-Null
node localizador.mjs buscar VM-0021 --seg 0 --color green | Out-Null      # A-02-06-03 y B-01-06-01
node localizador.mjs encender A-01-01-01 --color blue --blink 0 | Out-Null
node localizador.mjs encender A-01-06-03 --color yellow --blink 0 | Out-Null
Start-Sleep -Seconds 2
Capturar "wokwi-vscode-tiras.png"
node localizador.mjs apagar | Out-Null
Pop-Location
