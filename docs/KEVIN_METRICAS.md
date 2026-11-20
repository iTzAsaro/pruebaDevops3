# IE1 — Métricas, salud y logs de VI CITY

## Alcance y endpoints

Ambos servicios usan `node:http` sin framework. Cada uno tiene un registro Prometheus independiente y expone `GET /metrics` en formato de texto Prometheus 0.0.4, con etiqueta `service=backend|frontend`. Se usa `prom-client` 15.1.3 para mantener compatibilidad con Node 20; npm marca el paquete como reemplazado por `@prometheus-io/client`, cuya versión actual requiere Node 22 o superior. Revisar la migración al actualizar el runtime.

| Servicio | Puerto | Endpoints |
|---|---:|---|
| Backend | 3000 | `GET /metrics` para scrape. `GET /api/health` conserva HTTP 200 y sus campos (estado, uptime, timestamp, metadatos y memoria); `dependencies: {}` indica que no hay dependencias externas que sondear. `GET /api/metrics` conserva su JSON de negocio. |
| Frontend | 5000 | `GET /metrics` para scrape. `GET /healthz` comprueba el servidor web sin consultar al upstream; informa si el backend está configurado y no comprobado. `GET /api/health` sigue pasando por el proxy cuando `BACKEND_URL` está configurado; usar esa ruta para una sonda extremo a extremo independiente. |

## Series

| Métrica | Tipo y unidad | Etiquetas además de `service` |
|---|---|---|
| `vicity_http_requests_total` | Counter, respuestas completadas; sumar sus series para el total | `method`, `route`, `status_code` |
| `vicity_http_request_duration_seconds` | Histogram, segundos desde entrada HTTP hasta `finish`; expone `_bucket`, `_sum`, `_count` | Las anteriores, y `le` en buckets |
| `vicity_http_errors_total` | Counter, respuestas 4xx y 5xx; ambas series inicializadas en cero | `status_class` (`4xx` o `5xx`) |
| `vicity_process_uptime_seconds` | Gauge, segundos de vida del proceso Node | — |
| `process_cpu_seconds_total` | Counter, CPU acumulada en segundos | — |
| `process_resident_memory_bytes`, `nodejs_heap_size_used_bytes`, `nodejs_heap_size_total_bytes` | Gauges, memoria en bytes | — |

Las métricas predeterminadas adicionales de `prom-client` dependen del sistema operativo. Los métodos fuera de la lista permitida se agrupan como `OTHER`. El backend etiqueta con la plantilla registrada (por ejemplo `/api/orders/:id`), `unmatched` o `preflight`; el frontend usa `/`, `static` o `api_proxy`. Los GET de scrape y de salud no cuentan como tráfico de aplicación; también se excluye la salud reenviada por el proxy. Las respuestas interrumpidas antes de `finish` no se contabilizan. Una llamada por proxy puede aparecer en ambos servicios; no sumar ambos como si fueran solicitudes únicas de usuario.

Los logs de acceso salen por stdout en JSON e incluyen `requestId`, `statusCode` y `durationMs`. Los scrapes y health checks generan logs aunque no cuenten como tráfico de aplicación en Prometheus. Consulta [KEVIN_LOGGING.md](KEVIN_LOGGING.md) para el esquema y las reglas de privacidad.

## PromQL (con ambos targets configurados en Prometheus)

```promql
# Solicitudes/segundo por servicio
sum by (service) (rate(vicity_http_requests_total[5m]))
# Latencia p95 por servicio, en segundos
histogram_quantile(0.95, sum by (service, le) (rate(vicity_http_request_duration_seconds_bucket[5m])))
# Respuestas de error/segundo por clase
sum by (service, status_class) (rate(vicity_http_errors_total[5m]))
# CPU del proceso, en núcleos equivalentes
rate(process_cpu_seconds_total[5m])
# RSS, heap usado y uptime (consultas independientes)
process_resident_memory_bytes
nodejs_heap_size_used_bytes
vicity_process_uptime_seconds
```

## Verificación local

Con Node 20.19 o posterior en la serie 20, desde la raíz del repositorio:

```sh
npm --prefix backend ci --ignore-scripts
npm --prefix frontend ci --ignore-scripts
npm --prefix backend test
npm --prefix frontend test
```

En dos terminales, ejecutar `npm --prefix backend start` y `npm --prefix frontend start`. `BACKEND_URL` no es necesario para servir estáticos; para verificar el proxy, configurar `BACKEND_URL=http://127.0.0.1:3000` antes de iniciar frontend. Ejemplos (usar `curl.exe` en PowerShell):

```sh
curl -fsS http://localhost:3000/api/health
curl -fsS http://localhost:5000/healthz
curl -fsS http://localhost:3000/api/catalog
curl -s -o /dev/null http://localhost:5000/archivo-no-existente
curl -fsS http://localhost:3000/metrics
curl -fsS http://localhost:5000/metrics
```

Repetir la petición de catálogo y confirmar que aumentan el contador y `_count` de su serie; comparar también el log JSON. En Windows se puede omitir `-o /dev/null`. Las pruebas automatizadas generan 500/502 de forma controlada únicamente durante las pruebas; no hay rutas de error agregadas a producción.

## Límites y operación

- El navegador no expone métricas de proceso; el frontend mide su servidor Node (assets y proxy), no renderizado, Web Vitals ni compras almacenadas en `localStorage`. CPU/RSS aquí son **del proceso**, no del contenedor o pod; para eso, usar la fuente de infraestructura correspondiente.
- Las series HTTP se crean al observar tráfico. Los contadores y el uptime reinician con el proceso; el histórico depende de Prometheus. `up` comprueba el scrape, no la disponibilidad funcional extremo a extremo.
- `/metrics` comparte el puerto HTTP existente. Antes de exponer el stack en AWS, acordar con infraestructura el filtrado de esa ruta en el ingreso público y permitir scrape interno. No se cambiaron seguridad, AWS ni CI principal.
- Esta etapa deja instrumentación y verificaciones de aplicación. La recolección persistente de logs, scrape continuo, sondas externas y evidencias del entorno desplegado quedan pendientes para cerrar IE1.
