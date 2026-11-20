# EP3 — Inventario y plan de observabilidad (Kevin)

Base inspeccionada: `origin/main` en `ce5dd2390ea67bf1e1cb07d14eeb8d83c17ab1f1`, clonada en `pruebaDevops3/`. Rama local: `feature/kevin-observability`. Este archivo es el único cambio del checkout. Las propuestas son pendientes, no evidencia de implementación.

## Alcance y rúbrica

Se revisaron [CHECKLIST_EP3.md](CHECKLIST_EP3.md) y las cinco páginas de la [pauta oficial](EP3_DOY0101_Estudiante.pdf), con extracción de texto en un directorio temporal. La pauta (pp. 2 y 4) exige IE1 (20%): logs, uso, errores y disponibilidad de todos los servicios; IE3 (10%): dashboards con tiempo de despliegue, cobertura, CPU/memoria y errores integrados al CI/CD. IE2 es despliegue orquestado en nube; un entorno Compose no lo sustituye. El README y el workflow conservan rótulos de EP2: no usar sus numeraciones como rúbrica EP3. El PDF indica trabajo en parejas, mientras que el checklist asigna tres integrantes: confirmar con el docente. Este inventario asistido por IA es material de trabajo: el equipo debe verificarlo, declarar y citar la asistencia según p. 3 y producir por cuenta propia su análisis evaluado, justificaciones, conclusiones y reflexiones individuales.

## Entorno y ejecución

| Herramienta | Verificación local |
|---|---|
| Git, Node.js, npm | Git 2.53.0.2, Node.js 24.16.0, npm 11.13.0. CI y contenedores usan Node 20. |
| Docker y Compose | Cliente Docker 29.2.1, Compose 5.1.0. `docker compose config --quiet` validó base y combinación con desarrollo; `version: '3.8'` genera aviso de obsolescencia. El daemon Linux de Docker Desktop no respondió; no se construyeron ni ejecutaron contenedores. |
| Kubernetes y AWS | `kubectl` cliente 1.34.1 y AWS CLI 2.35.8. No se consultaron clústeres, credenciales ni recursos AWS. |
| Observabilidad | No se detectaron ejecutables Helm, Prometheus, Grafana ni Fluent Bit en PATH. No hay configuraciones versionadas de Prometheus, Grafana, CloudWatch ni colectores. Esto no descarta instalaciones externas. |

## Aplicación: dos servicios desplegables

| Servicio | Stack y estado |
|---|---|
| `backend` (3000, v1.0.0) | API REST JavaScript CommonJS, `node:http`, router propio. Catálogo estático; órdenes, ítems y contadores en memoria, sin BD. No usa Express. |
| `frontend` (5000, v1.0.1) | `frontend/server.js` (CommonJS, `node:http`) sirve SPA HTML/CSS/JS con módulos ES nativos y router hash, sin framework ni bundler. También actúa como proxy. |

No hay otros servicios ni dependencias npm de producción. `backend/src/router.js` registra 12 operaciones: GET health, catalog, platforms, editions, items, orders, orders/:id y metrics; POST items y orders; PATCH orders/:id/cancel y DELETE orders/:id (todas bajo `/api`).

- **Salud:** `GET /api/health` devuelve 200 con estado, metadatos, uptime, RSS/heap y timestamp; no verifica dependencias externas. Frontend no tiene endpoint de salud propio; `/` comprueba entrega de HTML, no conectividad al backend.
- **Métricas:** `/api/metrics` devuelve JSON con totales de órdenes, ingresos CLP, distribuciones y `devopsStats`. `totalProcessedRequests` incrementa con la creación de órdenes, no cuenta tráfico HTTP general. No hay `/metrics` Prometheus, histogramas ni series HTTP por estado. Preservar `/api/metrics` como contrato de negocio.
- **Logs:** `backend/src/middleware/logger.js` registra texto con timestamp, método, URL cruda, estado y duración al emitir `finish`. Puede registrar la query (por ejemplo, filtro de correo de órdenes); sin niveles ni ID de correlación. `frontend/server.js` solo registra inicio, sin logs de acceso o fallos del proxy.
- **Comunicación:** Compose fija `BACKEND_URL=http://backend:3000`; el frontend reenvía peticiones `/api…`, incluido método, query y cuerpo, sin timeout explícito. Un fallo de conexión se traduce en 502. **La SPA no consume la API:** importa catálogo local y guarda reservas en `localStorage` (`vicity_state_v1`). Una compra en la interfaz no cambia las órdenes ni las métricas del backend. Para evidencias IE1 generar tráfico controlado contra ambos servicios y el proxy, sin afirmar que la UI produce transacciones en la API.

## Pruebas y scripts

Ambos módulos usan `node:test`, `node:assert` y `c8` 12.0.0 como dependencia de desarrollo (`c8` requiere, en la serie Node 20, al menos 20.19). `npm ci --ignore-scripts`, `npm test` y `npm run test:coverage` ejecutados en copias temporales con Node 24: **backend 10/10 y 85,52% de líneas; frontend 15/15 y 21,10% de líneas**. Ambos generaron `coverage/lcov.info`. No son resultados de GitHub Actions. Node emitió un aviso de tipo de módulo en frontend; npm informó cuatro vulnerabilidades moderadas en cada instalación (derivar a Alexsander, no aplicar fixes automáticamente).

- Backend: integración HTTP en puerto fijo 3999; salud, catálogo, plataformas, listado/alta/cancelación de órdenes, métricas, CORS y 404. Faltan casos de ítems, ediciones y parte del CRUD.
- Frontend: 10 casos de estructura/cliente, incluido Hero con mocks, y 5 HTTP de estáticos, MIME, 404, aislamiento de rutas y métodos. No se prueba proxy extremo a extremo ni flujo de compra en un navegador.
- Raíz `package.json`: `dev`, `dev:up`, `prod:up`, `down`, `logs`, `ps`, `test`, `coverage`, `smoke`, `setup:hooks` y `prepare`. `smoke` comprueba backend directo y raíz de frontend, no el proxy; varios comandos esperan sintaxis Unix. Los `start` arrancan Node directamente; `frontend build` solo imprime un mensaje. No se habilitaron hooks; `.githooks/` puede reconstruir un stack activo tras commit/merge/rewrite si se configura.

## Contenedores y Kubernetes

- `backend/Dockerfile` y `frontend/Dockerfile`: dos etapas `node:20-alpine`, `npm ci --omit=dev --ignore-scripts` con lockfile, runtime como `node` y copia selectiva. Exponen 3000/5000 respectivamente. Ambos tienen `.dockerignore`; el frontend sirve sus archivos sin bundler.
- `docker-compose.yml`: dos servicios, red bridge `vicity_network`, `restart: unless-stopped`. Backend publica 3000; frontend publica 5000 y 80 (ambos hacia 5000). Backend tiene healthcheck HTTP a `/api/health`, cada 15 s, timeout 5 s, 3 reintentos y gracia de 10 s. Frontend espera `service_healthy`, pero no tiene healthcheck propio. El orden de arranque no monitorea disponibilidad posterior ni reinicia por sí solo un contenedor `unhealthy`.
- `docker-compose.dev.yml`: overlay con montajes de código, `init: true` y watch de Node; `npm run dev` lo combina con la base. CI no usa el overlay. Sin contenedores de monitoreo, volúmenes de telemetría ni drivers de logging dedicados en Compose.
- No hay manifiestos Kubernetes, charts Helm ni overlay Kustomize versionados. Namespace, Deployments, Services, probes, Ingress/LB y recursos son pendientes de Paulo; los nombres del checklist no corresponden a archivos existentes.

## GitHub Actions y cobertura

Único workflow: `.github/workflows/ci.yml`. Corre por push o PR hacia `main`/`develop`; crear la rama local no dispara CI. `unit-tests` usa matriz backend/frontend en Ubuntu con Node 20, `npm ci --ignore-scripts`, `npm test`, luego `npm run test:coverage`. Normaliza `SF:src/` en LCOV y publica `coverage-backend` y `coverage-frontend` durante 14 días. No hay exportación de cobertura a un origen de datos de Grafana ni umbral explícito en esos pasos.

`security-audit` descarga ambos artefactos (tolera errores de descarga), ejecuta `npm audit --audit-level=high` y llama a SonarCloud si hay token; el fallback es solo chequeo sintáctico. `sonar-project.properties` declara ambos LCOV, pero excluye a frontend de cobertura y su ámbito no incluye `frontend/server.js`. La espera del Quality Gate está declarada para Sonar; el paso shell separado de compuerta tiene `FAILURES=0` fijo y no valida resultados. Revisar con Alexsander, sin cambiar seguridad en esta fase. Existe `.github/dependabot.yml`.

`docker-build` construye y verifica las dos imágenes etiquetadas con SHA (incluido usuario `node`). Los jobs posteriores no reciben esas imágenes: reconstruyen con Compose. `deploy-simulated` levanta Compose y hace un smoke al backend después de 5 s; un estado distinto de 200 solo emite advertencia. `deploy-cloud` depende del build, está condicionado a `main` y pasos gated por secretos; transfiere fuentes por SSH y ejecuta Compose en EC2. Sus smokes también pueden continuar tras fallas; un mensaje de éxito o una fecha por sí solos no prueban disponibilidad ni miden duración. No se verificó una ejecución hospedada, SonarCloud, protección de ramas ni un despliegue en AWS. `docs/evidencias/` solo contiene `.gitkeep`.

## Arquitectura candidata para validación del equipo

```text
Navegador → Frontend Node (SPA + proxy /api) → Backend Node
                  │ métricas + logs               │ métricas + logs
                  ├── /metrics ← Prometheus ───────┤
                  └── stdout JSON → colector ──────┘ → Loki o CloudWatch Logs
Prometheus ← sondas HTTP (Blackbox Exporter) y CPU/RAM de contenedor (kubelet/cAdvisor en K8s)
GitHub Actions → cobertura LCOV + tiempo real de rollout → publicador autorizado → almacén histórico
Grafana → Prometheus + fuente de logs + datos históricos CI/CD
```

Primero Compose opcional para desarrollo; luego scrape por pod y recolección de stdout en K8s acordados con Paulo. Para CPU/RAM local usar métricas de proceso como diagnóstico, no presentarlas como consumo de pod. En AWS verificar la fuente efectiva de CPU de contenedor (cores) y memoria working set (bytes). Para disponibilidad distinguir `up` (scrape) de `probe_success` (HTTP): probar frontend directo, backend directo y acceso por el proxy desde una ubicación representativa. Logs correlacionados por ID de petición, sin PII, cuerpos, credenciales ni query strings; no usar IDs ni rutas dinámicas como etiquetas de Prometheus. Registrar status y duración al terminar la respuesta, incluyendo 502 del proxy, y diferenciar HTTP 4xx/5xx de excepciones de aplicación.

**Paneles IE3:** (1) segundos desde inicio del despliegue hasta rollout y smoke operativo; separar simulado/AWS y mostrar fallos sin reportarlos como éxitos; (2) cobertura de líneas por módulo, `100 × LH/LF` del LCOV, sin interpretar reporte ausente como 0%; (3) CPU/RAM por workload/pod, con unidades y fuente explícitas; (4) tasa por servicio y clase 4xx/5xx, más consulta a logs de excepciones. Complementar con tráfico, latencia p95 y disponibilidad. Conservar SHA/run ID como metadatos de evidencia o anotaciones, no como etiquetas de alta cardinalidad. Candidato para histórico de CI/CD: métricas custom de CloudWatch desde job autorizado con OIDC y Grafana como lector, sujeto a revisión de IAM/costos; en local solo validar el contrato/artefactos, sin alegar integración histórica cloud.

## Trabajo pendiente, archivos y dependencias

1. **Alinear alcance (Kevin + equipo).** Confirmar rúbrica/participantes; acordar nombres de servicios, health contract, fuente de CPU/RAM, retención, backend de logs, origen histórico de CI/CD y permisos. Habilitar daemon local y comprobar puertos.
2. **Instrumentar backend y frontend (Kevin).** Nuevos `backend/src/observability/metrics.js`, `frontend/observability/metrics.js` y `frontend/observability/logger.js`; modificar `backend/src/server.js`, `backend/src/router.js`, `backend/src/middleware/logger.js`, `frontend/server.js`, ambos `package.json` y lockfiles. `prom-client` como dependencia de producción de ambos; logger JSON nativo sin paquete adicional. Mantener contrato de `/api/health`, añadir salud propia de frontend y exponer `/metrics` de cada servicio para scrape interno. Asegurar que `frontend/Dockerfile` copie el nuevo módulo y ajustar el overlay dev para montarlo. No abrir endpoints de métricas públicamente; coordinar protección y alcance de red antes de publicar.
3. **Probar instrumentación (Kevin).** Crear `backend/tests/observability.test.js` y `frontend/tests/server.test.js` con servidores locales de prueba. Validar contrato, status, rutas acotadas, counters e histograma, JSON parseable y ausencia de datos sensibles. Simular errores con mocks y comprobar caída/recuperación solo en entorno local controlado. Repetir suites y LCOV con Node 20.
4. **Provisionar stack local (Kevin).** Crear `docker-compose.observability.yml`, `observability/prometheus/prometheus.yml`, `observability/blackbox/blackbox.yml`, `observability/alloy/config.alloy`, `observability/loki/loki.yml` y `observability/grafana/provisioning/{datasources,dashboards}/`. Dependencias propuestas: imágenes versionadas de Prometheus, Blackbox Exporter, Grafana, Loki y Grafana Alloy para desarrollo. Acordar acceso mínimo a stdout de contenedores; no montar socket Docker en un contenedor sin revisar implicaciones. Configurar persistencia, retención y UI restringida al entorno de prueba.
5. **Integrar observabilidad en K8s (Paulo + Kevin).** Paulo define `k8s/` y despliegue; después añadir configuración de scrape y probes, fuente CPU/RAM, y colector (p. ej. Fluent Bit hacia CloudWatch Logs si se adopta esa ruta) en `k8s/observability/`. Validar descubrimiento por pod, permisos, límites, RBAC, rutas públicas, costos y retención; no asumir CRD `ServiceMonitor` sin Prometheus Operator. Tener en cuenta que escalar el backend sin persistencia separará las órdenes en memoria por réplica.
6. **Integrar CI/CD (Alexsander + Paulo + Kevin).** Proponer `scripts/ci/collect-observability.mjs` para resumir LCOV y resultados de despliegue y un cambio coordinado en `.github/workflows/ci.yml`: capturar inicio/fin/resultado, validar rollout y smokes de ambos servicios, versionar artefacto de métricas y publicar históricos desde contexto autorizado. No entregar credenciales a PRs no confiables ni dejar que un fallo de telemetría oculte el resultado del deploy. Alexsander revisa los checks y el gate real; Paulo autoriza cambios de AWS y aporta la señal de rollout. Al aprobar la integración cloud, acordar si los datos de CI y los logs usan CloudWatch y quién mantiene sus permisos.
7. **Dashboard y evidencia (Kevin).** Crear `observability/grafana/dashboards/vicity-observability.json` y `docs/OBSERVABILIDAD_RUNBOOK.md`; provisionar consultas/unidades y comprobar los cuatro paneles con datos reales. En `docs/evidencias/` capturar IE1_01 `/metrics` de ambos, IE1_02 targets `UP`, IE1_03 logs y errores de ambos, IE1_04 disponibilidad/latencia y recuperación; IE3_01 dashboard, IE3_02 consultas y IE3_03 exportación JSON (o referencia al JSON versionado). Registrar entorno, intervalo, SHA y run sin secretos. Validar que las métricas se correlacionen con el run original antes de entregar.
