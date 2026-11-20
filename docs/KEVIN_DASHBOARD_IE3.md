# EP3 | Observabilidad & CI/CD | Kevin Gallardo

## Importación y fuentes

El [JSON exportable](../observability/grafana/dashboards/ep3-kevin-gallardo.json) se carga automáticamente con el proveedor de archivos del [stack local](KEVIN_STACK_MONITOREO.md). En otra instancia: **Dashboards → New → Import**, cargar el JSON y conservar o reasignar los UID `vicity-prometheus` y `vicity-ci-history`. El primero apunta a Prometheus de runtime; el segundo usa un datasource Prometheus que apunta a la API de lectura de VictoriaMetrics. Sin el segundo datasource, los paneles CI no funcionan; no se aprovisiona una instancia nueva por defecto. Para aprovisionarlo, adaptar [el ejemplo](../observability/grafana/ci-history.datasource.yml.example) al montaje de provisioning de la instancia y suministrar URL y cabecera de lectura desde el gestor de secretos (quitar el bloque de autenticación si el acceso ya está protegido por otro mecanismo). Nunca reutilizar credenciales de escritura para Grafana. Configurar tema oscuro en preferencias del usuario en Grafana si la versión no respeta `style` del JSON.

Filtros: servicio (`backend`, `frontend`), namespace y entorno de runtime (`All` incluye series locales sin namespace), rama CI y entorno de despliegue. El selector de tiempo aplica al histórico y a los últimos valores dentro del rango. Para mostrar incrementos recientes de runtime, usar un rango corto (por ejemplo, 30 min); para CI partir de siete días y ajustar según la frecuencia de runs.

## Métricas, consultas y estado

El JSON contiene la consulta exacta de **cada** panel (`panels[].targets[].expr`). El [generador](../observability/grafana/generate-ie3.py) permite reproducirlo con Python estándar. Resumen de las consultas (filtros omitidos para facilitar la lectura):

| Paneles | Fuente y consulta | Estado |
|---|---|---|
| Duración histórica y última duración | `vicity_ci_deployment_duration_seconds`; `last_over_time` en ventanas del gráfico. El último usa `timestamp(last_over_time(...))` para elegir por timestamp entre resultados del mismo entorno y rama. Segundos. | Sin publicación ni lectura verificadas. Mide duración del job, no disponibilidad ni rollback/rollout exitosos. |
| Histórico de cobertura y último reporte | `last_over_time(vicity_ci_test_coverage_percent[...])`; c8 LCOV por módulo, porcentaje de líneas en escala 0–100. | LCOV existe en CI; la ingesta no está verificada. Un reporte ausente no es 0%. |
| CPU y memoria por contenedor | `rate(container_cpu_usage_seconds_total[...])` en núcleos; `container_memory_working_set_bytes` en bytes. Agrupar por entorno, namespace, pod y contenedor. | Pendiente de kubelet/cAdvisor en AWS. No usa métricas de proceso como sustituto. |
| CPU y memoria relativas a requests y limits | `100 × consumo / recurso` usando `kube_pod_container_resource_requests` y `kube_pod_container_resource_limits`. Solo denominadores positivos. | Pendiente de kube-state-metrics y etiquetas compatibles. |
| Tasas 4xx/5xx, porcentaje y tráfico | `rate(vicity_http_errors_total[...])` por clase, dividido por `rate(vicity_http_requests_total[...])` para porcentaje; este último también alimenta tráfico. | Series instrumentadas y probadas en Node; paneles no verificados en Grafana. |
| p95 | `histogram_quantile(0.95, sum by(service,environment,namespace,le)(rate(vicity_http_request_duration_seconds_bucket[...])))`. Segundos. | Instrumentación probada; renderizado no verificado. |
| UP/DOWN y disponibilidad | `up` (estado scrape) y `probe_success` (Blackbox HTTP), 1/0. | Sin scrape ni sondas verificadas en ejecución en esta etapa. |

El gráfico CI toma la última muestra por intervalo, no fabrica puntos entre ejecuciones; con un rango amplio puede agrupar runs cercanos. El importador también publica `vicity_ci_pipeline_duration_seconds` como señal separada. No mezclar ambos tiempos. Consultar el [contrato del importador](../scripts/ie3/README.md) para ejecutar el workflow manual, revisar el artefacto de un dry-run y aprobar una publicación. Para evitar atribuir cobertura al intento equivocado, actualmente se omite en reruns. Los contadores del proxy y backend se mantienen separados: sumar ambos sobrecuenta peticiones de usuario.

## Coordinación y aceptación

- **Alexsander:** revisar la automatización independiente de ingesta en `scripts/ie3/` y el workflow asociado antes de habilitarla. El workflow principal queda intacto. Autorizar solo el destino de escritura previsto y validar artefactos del run y del intento exactos. Los reportes de CI expiran: los vencidos no pueden recuperarse desde Actions. Validar importando un run real, contrastar timestamps/duración con la API del job y cobertura con el LCOV, y comprobar que una repetición no crea una ejecución adicional en el histórico.
- **Paulo:** confirmar el Prometheus de AWS, acceso a kubelet `/metrics/cadvisor` y kube-state-metrics, y normalizar `environment`, `namespace`, `pod`, `container` entre las fuentes, con una única recolección por nodo. Confirmar nombres de contenedor (`backend`/`frontend`); adaptar el filtro si son otros. Usar un datasource por clúster o ampliar agrupación con una etiqueta de clúster para no mezclar pods homónimos. Habilitar sondas solo donde haga falta y no publicar `/metrics` en el ingreso público.
- **Kevin:** abrir el dashboard y comparar paneles con **Explore** y los timestamps del run, verificar la última muestra por entorno/rama, generar tráfico real y verificar ambas clases de error en entorno de prueba. Si falta una fuente, registrar el panel como no validado, no rellenar con ceros. Capturar evidencias solo después de comprobar datos reales.

## Verificaciones locales de esta etapa

El JSON se generó y se parseó con Python. `promtool` 3.5.0 validó las 16 consultas del dashboard tras sustituir variables y macros de Grafana por valores de prueba. `docker compose config --quiet` validó el overlay con un valor ficticio para la contraseña. El motor Docker no respondió: no se verificó Grafana ni la entrega CI en un servicio remoto. No se desplegó nada en AWS.
