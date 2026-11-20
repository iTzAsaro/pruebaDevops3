# EP3 — Stack local de monitoreo

## Arquitectura

El overlay `docker-compose.monitoring.yml` agrega Prometheus, Blackbox Exporter y Grafana al Compose existente, sin alterar CI ni el despliegue EC2. Backend y frontend conservan su red y puertos originales y se conectan además a la red interna `vicity_monitoring`. Prometheus extrae `/metrics` de `backend:3000` y `frontend:5000` cada 15 s, con etiquetas `service` y `environment=local`. Blackbox ejecuta tres sondas HTTP 200: backend directo, frontend directo y backend vía proxy. Grafana consulta Prometheus en `monitoring_ui` por `http://prometheus:9090` usando el datasource provisionado `vicity-prometheus`.

Prometheus y Grafana tienen volúmenes nombrados y configuración de solo lectura. La retención de métricas está limitada por tiempo (15 días) y tamaño (1 GB de retención TSDB; reservar espacio adicional para WAL y operación). Las alertas locales se evalúan cada 15 s y pasan a firing tras 1 min de fallo continuo; no se instaló Alertmanager ni se envían notificaciones. El dashboard incluye disponibilidad, tráfico, p95, errores, CPU y RSS **del proceso**. Cobertura, tiempos de despliegue y consumo de pods no forman parte de este dashboard local.

## Inicio y detención (PowerShell, desde la raíz)

```powershell
Copy-Item observability/monitoring.env.example .env.monitoring.local
# Editar .env.monitoring.local: definir una contraseña propia; no versionar.
$dc = @('--env-file','.env.monitoring.local','-f','docker-compose.yml','-f','docker-compose.monitoring.yml')
docker compose @dc config --quiet
docker compose @dc pull prometheus blackbox grafana
docker compose @dc up --build -d --wait --wait-timeout 180
docker compose @dc ps
# Al terminar, conserva datos:
docker compose @dc down
```

No ejecutar `down -v` salvo que se quiera eliminar deliberadamente el histórico y las configuraciones persistidas. La contraseña de entorno inicializa el administrador en el primer arranque; cambiarla en el archivo no rota una contraseña ya almacenada. No publicar la salida expandida de `docker compose config` con credenciales reales.

| URL por defecto | Uso |
|---|---|
| http://127.0.0.1:3001 | Grafana; carpeta **VI CITY**, dashboard **Salud y tráfico**. |
| http://127.0.0.1:9090/targets | Prometheus; comprobar dos scrapes y tres sondas. |
| http://127.0.0.1:9090/alerts | Estado de reglas locales. |
| http://localhost:3000/api/health | Backend. |
| http://localhost:5000/healthz | Frontend. |

Blackbox no publica puerto al host. Solo los puertos nuevos de Grafana y Prometheus se enlazan a loopback; eso no cambia la exposición de los puertos de aplicación del Compose base.

## Verificación pendiente con el motor activo

```powershell
docker compose @dc exec prometheus /bin/promtool check config /etc/prometheus/prometheus.yml
curl.exe -fsS http://localhost:3000/api/health
curl.exe -fsS http://localhost:5000/healthz
curl.exe -fsS http://localhost:3000/metrics
curl.exe -fsS http://localhost:5000/metrics
curl.exe -fsS http://127.0.0.1:9090/api/v1/targets
curl.exe -fsSG http://127.0.0.1:9090/api/v1/query --data-urlencode 'query=probe_success{job="vicity-http-probes"}'
1..20 | ForEach-Object { curl.exe -fsS -o NUL http://localhost:5000/api/catalog; Start-Sleep -Seconds 2 }
curl.exe -fsSG http://127.0.0.1:9090/api/v1/query --data-urlencode 'query=sum by(service) (vicity_http_requests_total)'
```

Esperar al menos dos scrapes. Verificar que ambos targets de aplicación estén `UP` y que las tres sondas tengan `probe_success=1` (`UP` del job de sondas solo confirma que respondió Blackbox). En Grafana, abrir **Explore**, seleccionar **Prometheus** y ejecutar `up{job="vicity-apps"}`; después confirmar que el dashboard muestra tráfico real en ambos servicios. No usar el éxito de la API de salud de Grafana como prueba de conexión al datasource.

## Diagnóstico

- **Motor no disponible:** iniciar Docker Desktop con contenedores Linux y repetir `docker info`.
- **Puerto ocupado:** ajustar `PROMETHEUS_PORT` o `GRAFANA_PORT`. Si el conflicto es 80/3000/5000, revisar los bindings preexistentes del Compose base antes de cambiar nada.
- **Target DOWN / panel vacío:** revisar `docker compose @dc logs prometheus blackbox grafana`, el error del target y el nombre DNS. Dentro de Grafana no se usa `localhost` para Prometheus. Generar tráfico real para las series HTTP y ajustar el rango temporal.
- **Credenciales rechazadas:** revisar el volumen existente; gestionar la rotación de administrador sin borrar el volumen.

## Kubernetes/AWS

Consultar las [plantillas candidatas](../observability/kubernetes/README.md). Con Paulo, confirmar si ya existe Prometheus Operator, los Services, labels, puertos, permisos y red. Usar **una** variante: ServiceMonitor si está disponible o descubrimiento por EndpointSlice si no. Reutilizar Grafana/Prometheus existentes; no copiar el datasource local Docker a AWS. Conservar el UID si se aprovisiona un datasource distinto en cloud y adaptar las consultas dependientes de los jobs locales. Coordinar las sondas internas con un Blackbox existente si lo hay. No se consultó ni modificó AWS, ni el pipeline de despliegue. La recolección de logs sigue separada, en la propuesta Fluent Bit/CloudWatch.

## Estado verificado

`docker compose config --quiet` pasó con base + monitoreo, y con base + desarrollo + monitoreo, usando un valor ficticio solo para validar interpolación. Compose lista `backend`, `frontend`, `prometheus`, `blackbox` y `grafana`. El dashboard JSON se pudo parsear y contiene seis paneles. El daemon Linux de Docker Desktop no respondió: no se validaron imágenes, healthchecks en contenedores, reglas con promtool, targets `UP`, datasource en ejecución ni gráficos con datos.
