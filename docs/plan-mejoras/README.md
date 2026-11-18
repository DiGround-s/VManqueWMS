# Plan de mejoras — Grupo 5

Registro de cómo resolvemos cada punto del *Plan de Mejoras* del informe Capstone 2.5. Plazo: **23 de noviembre de 2026**.

Cada parte tiene su propio archivo con la misma estructura:

1. **Qué pide el plan**: el punto exacto (por ejemplo 1.3).
2. **Qué hicimos y por qué.**
3. **Cómo probarlo**: pasos que cualquiera puede repetir.
4. **Evidencia**: figuras y tablas numeradas, con una línea que explica qué demuestra cada una.
5. **Estado**: ✅ implementado y probado · 🟡 parcial · ⏳ pendiente.

> **Orden de trabajo:** la web publicada no se modifica mientras avanzamos. Primero se arma y documenta la infraestructura, y los cambios de código (seguridad, MQTT, pruebas) se aplican todos juntos al final, para publicar una sola versión nueva.

> **Regla del grupo:** sólo se afirma lo que tiene evidencia. Un mensaje de consola no prueba que algo pasó en el mundo físico. Lo simulado se dice que es simulado.

## Partes

| # | Parte | Puntos del plan | Fecha | Estado |
|---|---|---|---|---|
| 0 | [Arquitectura final y justificación](00-arquitectura.md) · [Guía simple del sistema](guia-simple.md) | 1.1, 2.1, 2.2, 2.6 | 18 nov | ✅ |
| 1 | Máquinas virtuales: pfSense, Ubuntu Server, dispositivo IoT | 1.6 (base) | 19 nov | ⏳ |
| 2 | Seguridad de la aplicación: usuarios, roles, API, CORS, modo producción | 1.4, 1.5, 1.7 | 19–20 nov | ⏳ |
| 3 | Pruebas de la API e integridad del inventario | 1.3, 1.4, 2.4 | 20 nov | ⏳ |
| 4 | Flujo completo producto → LED (MQTT real, ESP32 simulado) | 1.2, 2.3 | 21 nov | ⏳ |
| 5 | Reglas de pfSense y pruebas de tráfico | 1.6, 2.5 | 21–22 nov | ⏳ |
| 6 | Informe, cronograma, criterios de aceptación y presentación | 1.8, 1.9, 2.7, 2.8 | 22–23 nov | ⏳ |

## Matriz de estado del sistema

Se actualiza al cerrar cada parte. Es la base de la lámina de resultados (punto 2.7).

| Componente | Estado | Evidencia |
|---|---|---|
| Aplicación web (oficina + teléfono) | ✅ | Publicada en el dominio de producción; código en este repo |
| API REST v1 (pedidos, stock, webhooks) | 🟡 | Funciona; faltan pruebas documentadas (parte 3) |
| Base de datos PostgreSQL con restricciones | 🟡 | Restricciones en la migración inicial; faltan pruebas (parte 3) |
| Autenticación y roles | 🟡 | Implementado (bcrypt, sesión firmada, 3 roles); faltan pruebas (parte 2) |
| Infraestructura de laboratorio (VMs) | ⏳ | Parte 1 |
| Segmentación y reglas pfSense | ⏳ | Partes 1 y 5 |
| Envío de la orden al ESP32 por MQTT | ⏳ | Hoy sólo existe la simulación en el navegador; parte 4 |
| ESP32 y LED físicos | ⏳ | Sin hardware. Firmware listo en `firmware/`, dispositivo simulado (parte 4) |
