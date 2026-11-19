# Mercado Libre: entorno de pruebas de integración

Réplica local de la API de Mercado Libre (mock server) para probar el conector de la web sin una cuenta real.
Imita la forma real de:
- **OAuth 2.0:** `/authorization` y `/oauth/token`.
- **Notificaciones:** un JSON con `_id`, `resource`, `topic`, `user_id`, `application_id` y `attempts`.
- **Recursos:** `/orders`, `/shipments`, `/questions` + `/answers`, `/messages/packs/...` y `/post-purchase/v1/claims/...`.

| Archivo | Para qué |
|---|---|
| `config.mjs` | La «aplicación» registrada: client_id, secreto, URL de redirección y URL de notificaciones |
| `servidor.mjs` | API + página de autorización + página del comprador (`http://127.0.0.1:4100/comprador`) |
| `publicar.mjs` | Crea las publicaciones del vendedor desde el catálogo del WMS (cada una con su `seller_sku`) |
| `pruebas.mjs` | Pruebas ML-01 a ML-12 con navegador real; resultados en `evidencia/ml.json` |
| `ver.cjs` | Muestra lo que el conector guardó en la base (avisos, pedidos y conversaciones) |

## Uso

1. **Variables en `.env` de la web.** Ver `.env.example`; en el laboratorio:
   ```
   ML_API_URL="http://127.0.0.1:4100"
   ML_AUTH_URL="http://127.0.0.1:4100/authorization"
   ML_CLIENT_ID="5839201746281734"
   ML_CLIENT_SECRET="lab-ml-secreto-0b7d6c2e9a"
   ML_REDIRECT_URI="http://localhost:3000/api/integraciones/mercadolibre/callback"
   ```
2. Ejecuta `node ml-pruebas/publicar.mjs` y después `node ml-pruebas/servidor.mjs`.
3. **Conecta la cuenta:** en la web, Ajustes › Integraciones › «Conectar con Mercado Libre» › «Autorizar».
4. **Juega de comprador:** en `http://127.0.0.1:4100/comprador` compra, pregunta, escribe, reclama o cancela.
   Todo aparece en Pedidos y en Atención, y lo que se responde allí vuelve al comprador.

## Pasar a Mercado Libre real

Se usa el mismo código de la web. Solo cambian las variables:

1. **Crear la aplicación** en developers.mercadolibre.cl › Mis aplicaciones.
   - URL de redirección: `https://<dominio>/api/integraciones/mercadolibre/callback`.
   - URL de notificaciones: `https://<dominio>/api/v1/integraciones/mercadolibre/notificaciones`.
   - Tópicos: `orders_v2`, `questions`, `messages`, `claims`.
2. **Configurar las variables:**
   - `ML_API_URL=https://api.mercadolibre.com`
   - `ML_AUTH_URL=https://auth.mercadolibre.cl/authorization`
   - `ML_CLIENT_ID` y `ML_CLIENT_SECRET` de la aplicación.
3. **Probar sin dinero real:** crear usuarios de prueba con `POST /users/test_user`, uno vendedor y otro comprador.
