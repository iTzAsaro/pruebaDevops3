# KEVIN — Entrega de observabilidad EP3

## Resumen técnico

IE1 implementa instrumentación HTTP, salud, métricas Prometheus, logs JSON con correlación y candidatos de recolección para ambos servidores Node.js. IE3 implementa un dashboard con fuentes CI, cobertura, recursos de contenedor y errores, más un recolector de CI. La revisión final no modificó código funcional en esta etapa. No se marcan como aprobados requisitos que dependan de Grafana, Prometheus o AWS en ejecución.

## Archivos creados y modificados

| Categoría | Rutas |
|---|---|
| Backend | `backend/src/{server.js,router.js,controllers/catalogController.js}` modificados; `backend/src/observability/{metrics.js,logger.js}`, `backend/tests/observability.test.js` nuevos; `backend/{package.json,package-lock.json}` modificados para `prom-client` 15.1.3 y suites. |
| Frontend | `frontend/server.js` modificado; `frontend/observability/{metrics.js,logger.js}`, `frontend/tests/observability.test.js` nuevos; `frontend/{package.json,package-lock.json}` modificados. |
| Compose | `docker-compose.dev.yml` modificado para montar el módulo de observabilidad; `docker-compose.monitoring.yml` nuevo. |
| Grafana y Prometheus | `observability/prometheus/{prometheus.yml,alerts.yml}`, `observability/blackbox/blackbox.yml`, `observability/grafana/dashboards/{ep3-kevin-gallardo.json,vicity-overview.json}`, `observability/grafana/{generate-ie3.py,ci-history.datasource.yml.example,provisioning/...}`, `observability/monitoring.env.example` nuevos. |
| Recolección | `observability/logging/{fluent-bit.conf,pipeline.conf,selection.conf,validate-selection.conf,README.md}` y `observability/kubernetes/{README.md,scrape-configs.yaml.example,servicemonitor.yaml.example}` nuevos. |
| CI/CD | `.github/workflows/ie3-metrics.yml` nuevo; `ci.yml` y las dependencias de sus jobs sin cambios. |
| Herramientas | `scripts/ie3/{collect.mjs,collect.test.mjs,read-lcov.py,validate-promql.py,README.md}`. |
| Documentación | Nuevos: `docs/KEVIN_{ANALISIS_OBSERVABILIDAD,METRICAS,LOGGING,STACK_MONITOREO,DASHBOARD_IE3,ENTREGA_EP3}.md`, este último incluido en este commit de cierre. |

No hay archivos de credenciales. `observability/monitoring.env.example` solo contiene marcadores. El grupo original del repositorio y el workflow `ci.yml` quedaron intactos; no se modificó `docs/CHECKLIST_EP3.md` porque las pruebas desplegadas aún faltan.

## Procedimientos reproducibles

```powershell
git switch feature/kevin-observability
npx --yes --package=node@20 -c 'npm ci --ignore-scripts'
npx --yes --package=node@20 -c 'npm --prefix backend test && npm --prefix frontend test'
npx --yes --package=node@20 node --test scripts/ie3/collect.test.mjs
```

El stack local se levanta con Docker Desktop Linux activo, `Copy-Item observability/monitoring.env.example .env.monitoring.local`, definir una contraseña en ese archivo, luego `docker compose --env-file .env.monitoring.local -f docker-compose.yml -f docker-compose.monitoring.yml up --build -d --wait --wait-timeout 180`. Verificar targets, datos y dashboard según `docs/KEVIN_STACK_MONITOREO.md`; no publicar `/metrics` en AWS sin autorización.

## Resultados verificados

| Prueba | Resultado |
|---|---|
| Suite Node.js 20.20.2 backend, frontend, recolector | 12/12, 16/16 y 5/5 pasadas; total 33, sin fallos ni omisiones. |
| `promtool check config observability/prometheus/prometheus.yml` | Válido; dos reglas de alerta. |
| `promtool check rules` sobre las 16 consultas del dashboard, variables y macros sustituidas | Válidas tras corregir sintaxis durante la revisión; no garantiza resultados con datos. |
| JSON de ambos dashboards | Parseables. |
| `docker compose config --quiet` con base+monitoreo y base+desarrollo+monitoreo | Válidos; solo aviso heredado de `version`. |
| `git diff --check` | Sin errores de whitespace; Git advierte conversión LF→CRLF. |
| Comprobación de patrones de secretos en código versionado | Sin coincidencias. |

**Docker no respondió** al daemon Linux. Por tanto, targets UP, health checks de contenedores, datasource de Grafana, dashboards en ejecución e ingesta CI/AWS están pendientes. No se consultó ni cambió AWS.

## Estado de indicadores y evidencias

- **IE1:** implementación local completa y pruebas de aplicación superadas; **no aprobado de extremo a extremo** hasta comprobar Prometheus, recolector y operación desplegada. No se marcaron casillas de CHECKLIST_EP3.md.
- **IE3:** dashboard y importador implementados y validados estáticamente; **no aprobado de extremo aęt** hasta disponer de Grafana, datasources conectados, muestras históricas reales de CI y CPU/RAM de pods.
- Evidencias de implementación/validación, no de despliegue: `docs/KEVIN_METRICAS.md`, `docs/KEVIN_LOGGING.md`, `docs/KEVIN_STACK_MONITOREO.md`, `docs/KEVIN_DASHBOARD_IE3.md`, `scripts/ie3/README.md`. No hay capturas de Grafana ni targets desplegados y no se crearon capturas simuladas.

## Dependencias e integración

| Responsable | Antes de revisar |
|---|---|
| Paulo | Confirmar clúster, Services, labels, puertos, kube-state-metrics/cAdvisor, logs a CloudWatch, permisos de lectura, rotación y red para Prometheus/Grafana. Adoptar una sola vía de scraping y no duplicar instancias. |
| Alexsander | Revisar el workflow manual y el env `ie3-metrics-publish`, autorizar lectura de Actions, importación a VictoriaMetrics y conexión de Grafana al histórico. Cambio mínimo sugerido si se requiere cobertura en reruns: añadir run attempt a artefactos y descargas. No reejecutar jobs previos. |
| Kevin | Con el stack activo, recopilar evidencias de IE1 e IE3, verificar los cuatro grupos del dashboard, confirmar latencia/errores bajo tráfico y contrastar tiempos y cobertura con el run original. |

## IA y autoría

Declaración factual propuesta para revisión humana: «Se utilizó OpenCode como apoyo a la implementación técnica, pruebas y documentación. Se revisaron por separado los archivos de instrumentación, logging, Prometheus/Grafana, recolector de CI, guías técnicas y cambios de scripts/configuración propuestos. No se usó IA para redactar reflexiones individuales ni justificaciones evaluadas; esas secciones quedan pendientes de redacción por los estudiantes». No se generan conclusiones ni reflexiones académicas en su nombre.

## Commit y control de versiones

Commits preparados en la rama local `feature/kevin-observability`, sin push ni merge:

- `feat(observability): instrumentar métricas y correlacionar logs`
- `feat(monitoring): configurar Prometheus y Grafana local`
- `feat(ie3): publicar histórico CI y dashboard`
- `docs(observability): documentar entrega y validaciones`

El último commit incluye la guía técnica, actualizaciones de documentación y esta entrega. No incluye evidencias gráficas pendientes.