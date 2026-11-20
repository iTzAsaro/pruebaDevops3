# IE1 — Logging y correlación

## Arquitectura

Los dos servidores `node:http` usan un logger JSON nativo sin otra dependencia. Cada respuesta HTTP completada emite una línea a stdout. Una respuesta interrumpida emite WARN, sin inventar un código si no se enviaron cabeceras. El backend etiqueta rutas por plantilla; el frontend agrupa estáticos y proxy. Salud y scrape aparecen en logs, pero no alteran los contadores de tráfico.

`X-Request-Id` se conserva solo si es un UUID v4 válido; si falta, es ambiguo o inválido, se genera uno con `crypto.randomUUID()`. El frontend lo envía al backend y devuelve ese mismo ID al cliente; el backend lo devuelve también en peticiones directas. Sirve para correlación, no autenticación ni prueba de origen. No se usa como etiqueta Prometheus.

## Formato y severidad

Muestra ilustrativa, no evidencia de una ejecución:

```json
{"timestamp":"2026-11-20T14:00:00.000Z","level":"INFO","service":"backend","message":"HTTP response completed","requestId":"ae31a3a9-525e-480b-a7b8-b8a8d082e8ff","method":"GET","route":"/api/catalog","statusCode":200,"durationMs":1.4}
```

- **INFO:** respuestas menores a 400 y arranque.
- **WARN:** respuestas 4xx (incluido 404 esperado) e interrupciones; no modifica estado ni cuerpo HTTP.
- **ERROR:** respuestas 5xx y fallos fatales. Al ejecutar el servicio como programa, un `uncaughtException` escribe un evento JSON mínimo a stderr y termina con código 1. Con el modo predeterminado de Node 20, también cubre las promesas rechazadas sin manejador que escalan a excepción fatal. No intenta continuar en un estado inconsistente. Un fallo fuera del ciclo HTTP no necesariamente tiene `requestId`.

Solo se emiten campos permitidos y mensajes fijos. No se escriben query strings, rutas crudas, cuerpos, cabeceras, cookies, tokens, credenciales, mensajes originales ni stacks en estos logs. Esto no cambia el contenido de las respuestas históricas de la API.

## Validación local

Ejecutar `npm --prefix backend test` y `npm --prefix frontend test`. Las pruebas ejercitan tráfico HTTP real sobre loopback, 404, 500 inyectado solo en pruebas, un 502 de upstream de prueba, reemplazo y propagación de IDs, y ausencia de marcadores sensibles. Una prueba en procesos aislados comprueba el evento fatal y salida no exitosa.

Para validación manual, iniciar ambos servicios según [KEVIN_METRICAS.md](KEVIN_METRICAS.md), con `BACKEND_URL` configurado en el frontend. Ejecutar `curl.exe -i http://localhost:5000/api/catalog` y `curl.exe -i http://localhost:5000/api/no-existe`. Comparar la cabecera `X-Request-Id` con la línea JSON de cada servicio. No inducir 500 en producción.

## Recolección y consulta

En Compose, consultar `docker compose logs --no-log-prefix backend frontend`. El repositorio no tiene manifiestos Kubernetes ni un colector desplegado. Se preparó una única ruta candidata para AWS: [Fluent Bit → CloudWatch Logs](../observability/logging/README.md), leyendo stdout/stderr en formato CRI y seleccionando los contenedores de aplicación. No se instaló un segundo backend de logs. Antes de activarla, confirmar con Paulo namespace, etiquetas, nombre de contenedores, montajes, permisos y retención. Si ya existe un colector, integrar la selección allí para evitar duplicación. Validar el filtro y la entrega antes de alegar ingesta en CloudWatch.

Ejemplo de CloudWatch Logs Insights para la configuración candidata (el JSON de aplicación queda en `log`):

```sql
fields @timestamp, jsonParse(log) as event
| filter event.requestId = "ae31a3a9-525e-480b-a7b8-b8a8d082e8ff"
| display @timestamp, event.service, event.level, event.route, event.statusCode
| sort @timestamp asc
```
