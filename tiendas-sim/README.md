# Falabella, Walmart, Paris y Hites simulados (laboratorio)

`node tiendas-sim/servidor.mjs` levanta en `http://127.0.0.1:4200` las cuatro tiendas. El panel `/` sirve para «simular compras».

| Tienda | Estilo de API | Cómo llegan los pedidos | Documentación |
|---|---|---|---|
| Falabella Seller Center | Query string firmada con HMAC-SHA256 (UserID + API key) | Webhook `onOrderCreated` + consulta de respaldo | Pública (developers.falabella.com) |
| Walmart Chile (Líder) | OAuth 2.0 *client credentials*, token en `WM_SEC.ACCESS_TOKEN` | Consulta cada 60 s + `acknowledge` | Pública (developer.walmart.com/cl-marketplace) |
| Paris (Cencosud) | **Supuesto**: REST + API key (Bearer) | Consulta cada 60 s + `accept` | No pública |
| Hites | **Supuesto**: REST + API key (Bearer) | Consulta cada 60 s + `accept` | No pública |

**Credenciales del laboratorio** (se ingresan en la web, en Ajustes › Integraciones):

| Tienda | Identificador | Clave |
|---|---|---|
| Falabella | `integraciones@vmanque.cl` | `lab-fala-6f1c0d9e4b7a2c58` |
| Walmart | `lab-wmt-client-31b7` | `lab-wmt-secreto-9e04c2` |
| Paris | `PAR-77012` | `lab-paris-key-5d2a91` |
| Hites | `HIT-4410` | `lab-hites-key-c37e08` |

**Variables de la web:**
- `FALABELLA_API_URL`, `WALMART_API_URL`, `PARIS_API_URL` y `HITES_API_URL`, que en el laboratorio apuntan a `http://127.0.0.1:4200/<tienda>`.
- `APP_PUBLIC_URL`, la URL pública del webhook.

Pruebas: `node tiendas-sim/pruebas.mjs` (TND-01 a TND-11); el resultado queda en `evidencia/tiendas.json`.
