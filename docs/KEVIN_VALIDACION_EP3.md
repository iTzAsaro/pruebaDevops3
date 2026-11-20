# Validación local EP3 — IE1 e IE3

Base de la prueba: rama `feature/kevin-observability`, commit `39d49fd`, proyecto Compose `vicity-ep3-qa`, Docker Engine Linux 29.2.1. Se levantaron ambos servicios, Prometheus, Grafana y Blackbox Exporter; los cinco quedaron `healthy`. No se usaron AWS ni servicios de otros proyectos.

| Requisito | Estado | Resultado / evidencia en `docs/evidencias/` |
|---|---|---|
| Salud y formato Prometheus | Aprobado local | `/api/health` y `/healthz` devolvieron estado `ok`; `IE1_01_backend.txt`, `IE1_01_frontend.txt` contienen respuestas reales de `/metrics`. |
| Scrape | Aprobado local | Dos targets de aplicación UP; `IE1_02_targets.json` conserva el resultado de la API. |
| Logs correlacionados | Aprobado local | Peticiones 200 y 404 con JSON de ambos servicios, `X-Request-Id` propagado en las peticiones de catálogo; `IE1_03_logs.json`. 500 y 502 se probaron de forma aislada con Node, no en el stack. |
| Tráfico, errores y sondas | Aprobado local | `IE1_04_prometheus.json`: 21 → 42 respuestas por servicio, 2 respuestas 4xx acumuladas por servicio, 0 respuestas 5xx en este stack. Tres sondas con valor 1. p95 estimado por histograma: 0,00475 s en ambos servicios al consultar. |
| Datasource e importación | Aprobado local | Grafana consultó la API Prometheus (`IE3_datasource_health.json`); dashboard provisionado con 16 paneles de datos, `IE3_02_consultas.json` y `IE3_03_dashboard.json` obtenidos de Grafana en ejecución. |
| Recursos | Parcial | CPU acumulada y RSS del proceso Node disponibles. No son métricas del contenedor. Pendientes cAdvisor y kube-state-metrics para los paneles de Kubernetes. |
| CI histórico y logs centralizados | Pendiente | No se publicaron datos CI ni se verificó Fluent Bit/CloudWatch; faltan autorización, destino de ingesta y ejecución real con evidencia atribuible al run. |

Node 20.20.2: backend 12/12, frontend 16/16, recolector 5/5. `npm ci` informó cuatro vulnerabilidades moderadas por módulo con dependencias de desarrollo; los builds con `--omit=dev` informaron cero. Compose base+monitoreo y base+desarrollo+monitoreo validaron con aviso heredado de `version`. Promtool validó la configuración, dos reglas y la sintaxis de las 16 consultas con macros sustituidas. Se corrigió la aceptación de `promtool.exe` en Windows. La credencial aleatoria generada quedó en `.env.monitoring.local`, ignorado por Git; no se detectó su valor ni patrones comunes de claves en las evidencias.

## Capturas manuales

1. Abrir `http://127.0.0.1:9090/targets`, expandir `vicity-apps`, capturar ambos targets UP como `IE1_02_targets.png`.
2. Ejecutar `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ie3/qa-local.ps1` desde la raíz para generar tráfico y exportar las respuestas. En `http://127.0.0.1:3001/d/vicity-overview`, elegir últimos 15 min y capturar disponibilidad y p95 como `IE1_04_disponibilidad_latencia.png`. Para logs, abrir `IE1_03_logs.json` y mostrar un mismo ID en ambos servicios; no presentar esto como CloudWatch.
3. En `http://127.0.0.1:3001/d/ep3-kevin-gallardo`, iniciar sesión con las credenciales locales, elegir entorno `local`, namespace `All` y rango de los últimos 15 min. Capturar las secciones como `IE3_01_dashboard_local.png`; identificar los grupos CI y Kubernetes sin datos, no ocultarlos como si hubieran sido aprobados. Los JSON de consultas y dashboard ya están guardados. Ninguna captura gráfica fue generada en esta validación.

Paulo: confirmar etiquetas, scrape privado, cAdvisor/kube-state-metrics y recolección de logs en AWS. Alexsander: verificar ingesta CI autorizada y cotejar timestamps y cobertura con un run real. No se cambió `ci.yml` ni se hizo push o merge hacia otra rama; la rama local avanzó únicamente al remoto de la misma rama mediante fast-forward antes de las pruebas.
