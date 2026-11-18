# Guía simple: cómo funciona el sistema

Para alguien que nunca programó. Sirve para preparar la defensa oral: ambos integrantes deberían poder contar esta historia completa.

## Las piezas, con una comparación

| Pieza | Es como… | Qué hace |
|---|---|---|
| **Navegador** (PC o teléfono) | El mesón de atención | Donde el operador pide y recibe información |
| **Servidor** (Ubuntu + Next.js) | El encargado de bodega | Recibe cada pedido, revisa que la persona tenga permiso y busca la respuesta |
| **Base de datos** (PostgreSQL) | El libro de inventario | Anota qué producto hay, cuántas unidades y en qué casilla. No acepta anotaciones imposibles |
| **Broker MQTT** (Mosquitto) | Un buzón de mensajes | El servidor deja un mensaje ("enciende A-02-06-03") y el dispositivo que está suscrito lo recibe |
| **ESP32** | Un pequeño computador en la estantería | Recibe el mensaje y enciende las luces correctas |
| **Tira LED** | Las luces de la estantería | Hay una tira por pasillo; cada casilla tiene sus propios 6 LED |
| **pfSense** | El guardia en la puerta de cada sector | Deja pasar sólo a quien corresponde: los usuarios hablan con el servidor y el ESP32 sólo con el buzón |

## Qué pasa cuando alguien busca un producto

1. **El operador busca** `VM-0004` en el mapa de la bodega (página `/mapa`), escribiéndolo o escaneando el código de barras.
2. **El navegador pide la información al servidor** por HTTPS, que es una conexión cifrada.
3. **El servidor revisa quién pide.** Si no hay sesión iniciada, lo manda al login. La revisión está en `src/middleware.ts`.
4. **El servidor consulta la base de datos**: qué casillas tienen ese producto y cuántas unidades (`src/app/(app)/mapa/page.tsx`).
5. **La pantalla muestra la ubicación**: `A-02-06-03` significa pasillo A-02, rack 6, nivel 3.
6. **Se calcula qué LED encender.** Cada casilla usa 6 LED de la tira de su pasillo y el primero se calcula con una fórmula fija (`src/features/map/led-mapping.ts`). Para A-02-06-03: ((6 − 1) × 4 + (3 − 1)) × 6 = 132, así que son los LED 132 a 137 de la tira A-02.
7. **Se envía la orden por MQTT** al tema `vmanque/bc/led/A-02-06-03` con el mensaje `{"on":1,"color":"green","blink":1}`.
8. **El ESP32 recibe la orden y enciende esos LED** en verde, parpadeando (`firmware/esp32-pick-to-light/`).
9. **El operador toma el producto** y lo registra. El stock se descuenta y queda anotado quién, cuándo y cuánto (tabla `StockMovement`).

> **Estado honesto (18 nov):** hoy los pasos 1 a 6 funcionan en la aplicación publicada. Los pasos 7 y 8 se muestran como **simulación en el navegador** (panel «Pick-to-light · ESP32» del mapa). En la parte 4, el servidor enviará la orden MQTT de verdad a un ESP32 simulado en el laboratorio. No tenemos el hardware físico.

## Por qué los datos no quedan inconsistentes

- **No hay stock negativo:** la base de datos tiene la regla `qty >= 0` y rechaza cualquier operación que la rompa.
- **No hay códigos repetidos:** el SKU, el código de barras y el código de ubicación son únicos.
- **No se borra un producto con stock:** las relaciones están protegidas (`onDelete: Restrict`).
- **Todo o nada:** un movimiento de stock y su registro en el historial se guardan juntos. Si algo falla, no se guarda ninguno de los dos.

## Quién puede hacer qué

| Rol | Puede |
|---|---|
| **Operador** | Usar el modo bodega: buscar, recoger, empacar, recibir, mover, contar |
| **Supervisor** | Lo anterior + pedidos, olas, ajustes de stock, ubicaciones y productos |
| **Administrador** | Todo + usuarios, API keys y ajustes |

Las contraseñas nunca se guardan tal cual: se guarda su *hash* bcrypt, un resumen del que no se puede recuperar la contraseña original. Los permisos se revisan en el servidor en cada acción, no sólo ocultando botones.

## Preguntas que pueden hacer en la defensa

- **¿Dónde se guardan los datos y qué pasa si se reinicia el servidor?** En PostgreSQL, en el disco. Se mantienen al reiniciar; lo demostramos en la parte 3.
- **¿Cómo sabe el sistema qué LED encender?** Por la fórmula del paso 6: el código de la ubicación dice el pasillo, el rack y el nivel.
- **¿Qué pasa si el ESP32 está apagado?** El mensaje no llega y la pantalla igual muestra la ubicación. La luz es una ayuda, no un requisito para trabajar.
- **¿Por qué el ESP32 no puede entrar a Internet?** Porque pfSense sólo le permite hablar con el broker MQTT. Si alguien lo hackea, no llega a ningún otro equipo.
- **¿Qué es CORS?** Una regla del navegador que impide que otra página web use nuestra API haciéndose pasar por el usuario. Sólo se acepta nuestro propio dominio (parte 2).
