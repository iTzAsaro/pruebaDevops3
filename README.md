cambios para ev 3

# Microservicio DevOps — Evaluación Parcial N°3: Observabilidad y Entornos Reales en DevOps

> **Asignatura:** DOY0101 - Ingeniería DevOps  
> **Institución:** Duoc UC  
> **Evaluación:** Evaluación Parcial 3 (30% ponderación)  
> **Estado:** 🟢 Completado / 100% Implementado, Auditado y Desplegado en AWS  
> **Matriz y Checklist:** [docs/CHECKLIST_EP3.md](docs/CHECKLIST_EP3.md)

[![CI/CD Pipeline](https://github.com/iTzAsaro/pruebaDevops3/actions/workflows/ci.yml/badge.svg)](https://github.com/iTzAsaro/pruebaDevops3/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=iTzAsaro_pruebaDevops3&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=iTzAsaro_pruebaDevops3)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=iTzAsaro_pruebaDevops3&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=iTzAsaro_pruebaDevops3)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=iTzAsaro_pruebaDevops3&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=iTzAsaro_pruebaDevops3)

---

## 👥 Equipo de Trabajo y Roles (EP3)

| Integrante | Rol en el Proyecto | Responsabilidad Principal en EP3 | Indicadores de Evaluación |
| :--- | :--- | :--- | :--- |
| **Paulo Rivas** | **Cloud & Infrastructure Engineer (AWS Specialist)** | Aprovisionamiento y despliegue orquestado en la nube AWS con Kubernetes, manifiestos K8s, exposición Ingress/LB y soporte de observabilidad cloud. | **IE2 (K8s en AWS)** & **IE1 (Cloud)** |
| **Kevin** | **Observability & Dashboards Engineer** | Instrumentación de métricas de aplicación en microservicios (`/metrics` Prometheus), logging estructurado y creación de dashboards CI/CD con las 4 métricas clave. | **IE1 (Monitoreo & Logs)** & **IE3 (Dashboards)** |
| **Alexsander Rosales** | **Tech Lead, Security & Governance Engineer** | Orquestación del pipeline CI/CD en GitHub Actions, Quality Gate estricto en SonarCloud, Branch Protection, corte ante fallas críticas y documentación técnica. | **IE5 (Cumplimiento)**, **IE6 (Fail-Safe)** & **IE4 (Docs)** |

---

## 🎯 Propósito del Proyecto (EP3: Observabilidad y Entornos Reales en DevOps)

El encargo de la **Evaluación Parcial N°3** consiste en extender el pipeline DevOps implementado, incorporando mecanismos de **observabilidad**, **métricas de desempeño y calidad**, despliegue en entornos orquestados en la nube (**Kubernetes en AWS**) y **validación automatizada de cumplimiento normativo**, garantizando una operación confiable, transparente y alineada a estándares de calidad:

1. **Monitoreo y Logging (IE1 - 20%):** Configuración de herramientas como Prometheus o AWS CloudWatch para visualizar logs, métricas de uso, errores y disponibilidad del microservicio.
2. **Despliegue Orquestado en la Nube (IE2 - 20%):** Despliegue de los microservicios en un clúster Kubernetes en AWS, integrando configuraciones automatizadas de monitoreo y observabilidad.
3. **Dashboards Personalizados en CI/CD (IE3 - 10%):** Creación de dashboards con métricas clave: tiempo de despliegue, cobertura de pruebas, uso de CPU/memoria y errores registrados.
4. **Documentación Técnica y Toma de Decisiones (IE4 - 10%):** Documentación de la integración de observabilidad y justificación de cómo las métricas fundamentan decisiones técnicas y mejora continua.
5. **Políticas de Cumplimiento (IE5 - 20%):** Aplicación rigurosa de políticas mediante SonarCloud (`pruebaDevops3`), Branch Protection Rules en GitHub y scripts de auditoría automatizada.
6. **Mecanismo de Bloqueo ante Fallas Críticas (IE6 - 20%):** Demostración empírica de que el pipeline se interrumpe automáticamente ante fallas críticas de seguridad o calidad, protegiendo producción.

---

## 📚 Índice Maestro de Documentación y Entregables EP3

| Documento | Indicadores Cubiertos | Responsable | Descripción |
| :--- | :---: | :---: | :--- |
| [**`docs/CHECKLIST_EP3.md`**](docs/CHECKLIST_EP3.md) | **Todos (IE1-IE6)** | Equipo | Matriz integral de cumplimiento, trazabilidad y estado de evidencias. |
| [**`docs/TOMA_DE_DECISIONES.md`**](docs/TOMA_DE_DECISIONES.md) | **IE4 (10%)** | Alexsander | Informe técnico de decisiones basadas en métricas y declaración ética de IA. |
| [**`docs/POLITICAS_CUMPLIMIENTO_Y_AUDITORIA_IE5.md`**](docs/POLITICAS_CUMPLIMIENTO_Y_AUDITORIA_IE5.md) | **IE5 (20%)** | Alexsander | Arquitectura de Branch Protection, escaneo SAST y SonarCloud Quality Gate. |
| [**`docs/PROTOCOLO_PRUEBA_FAIL_SAFE_IE6.md`**](docs/PROTOCOLO_PRUEBA_FAIL_SAFE_IE6.md) | **IE6 (20%)** | Alexsander | Protocolo de PoC de corte de pipeline ante falla crítica y recuperación en PR #7. |
| [**`docs/EVIDENCIAS_IE2_PAULO_RIVAS.md`**](docs/EVIDENCIAS_IE2_PAULO_RIVAS.md) | **IE2 (20%)** | Paulo | Aprovisionamiento en AWS EC2, clúster K8s, pods y smoke test. |
| [**`docs/KEVIN_ENTREGA_EP3.md`**](docs/KEVIN_ENTREGA_EP3.md) | **IE1 (20%) & IE3 (10%)** | Kevin | Resumen de entrega del módulo de observabilidad, endpoints y dashboards. |
| [**`docs/KEVIN_DASHBOARD_IE3.md`**](docs/KEVIN_DASHBOARD_IE3.md) | **IE3 (10%)** | Kevin | Especificación de los 4 paneles de Grafana y consultas PromQL. |
| [**`docs/KEVIN_METRICAS.md`**](docs/KEVIN_METRICAS.md) | **IE1 (20%)** | Kevin | Catálogo de métricas HTTP, heap y disponibilidad en `/metrics`. |
| [**`docs/KEVIN_STACK_MONITOREO.md`**](docs/KEVIN_STACK_MONITOREO.md) | **IE1 (20%)** | Kevin | Configuración del stack Prometheus, Grafana y Blackbox Exporter. |
| [**`docs/KEVIN_LOGGING.md`**](docs/KEVIN_LOGGING.md) | **IE1 (20%)** | Kevin | Pipeline de recolección y formato JSON de logs estructurados. |
| [**`docs/evidencias/`**](docs/evidencias/) | **IE4, IE5, IE6** | Alexsander | 10 Capturas de pantalla reales en alta resolución respaldando la evaluación. |

---

## 🏗️ Arquitectura del Pipeline CI/CD & Observabilidad

```mermaid
flowchart TD
    subgraph Trigger ["Disparadores de Eventos"]
        Push[Push a develop / main] --> Pipeline
        PR[Pull Request a main] --> Pipeline
    end

    subgraph Pipeline ["GitHub Actions CI/CD Pipeline (.github/workflows/ci.yml)"]
        subgraph Stage1 ["Fase 1: Testing & Cobertura"]
            T1["Test Backend (Node test runner)"]
            T2["Test Frontend (Node test runner)"]
            Cov["Reportes de Cobertura LCOV"]
            T1 --> Cov
            T2 --> Cov
        end

        subgraph Stage2 ["Fase 2: Seguridad, SAST y Calidad (IE5 & IE6)"]
            Dep["Dependabot & Auditoría de Dependencias"]
            Sonar["SonarCloud SAST (pruebaDevops3)"]
            QG{"Quality Gate (IE6):\n¿Cumple umbrales de calidad y seguridad?"}
            Sonar --> QG
        end

        subgraph Stage3 ["Fase 3: Contenerización"]
            B1["Build Dockerfile Backend (Multi-stage)"]
            B2["Build Dockerfile Frontend (Multi-stage)"]
        end

        subgraph Stage4 ["Fase 4: Orquestación & Despliegue Cloud en AWS (IE2)"]
            K8s["Despliegue en Kubernetes AWS (EKS / EC2 K3s)"]
            Pods["Pods Backend & Frontend (Replicas & Probes)"]
            Ingress["Ingress / Load Balancer Público"]
            K8s --> Pods --> Ingress
        end

        subgraph Stage5 ["Fase 5: Observabilidad & Métricas (IE1 & IE3)"]
            Prom["Prometheus / CloudWatch Agent (Logs & Métricas)"]
            Dash["Dashboard CI/CD (Tiempo Deploy, Cobertura, CPU/RAM, Errores)"]
            Prom --> Dash
        end

        Stage1 --> Stage2
        QG -- Superado (Passed) --> Stage3
        QG -- Falla Crítica Detectada --> Fail["🛑 Pipeline Interrumpido Automáticamente (IE6)"]
        Stage3 --> Stage4
        Stage4 --> Stage5
    end

    Ingress --> Success(["🚀 Microservicios Operativos y Observables en AWS"])
```

---

## 📂 Estructura del Repositorio

```text
├── .github/
│   ├── branch-protection-rules.json  # Definición inmutable de Branch Protection Rules (IE5)
│   ├── dependabot.yml                # Escaneo programado de dependencias npm y actions
│   └── workflows/
│       ├── ci.yml                    # Pipeline CI/CD integral (Tests, SonarCloud QG, Docker, Deploy AWS)
│       └── ie3-metrics.yml           # Recolección automatizada de métricas de build y cobertura
├── .sonarcloud.properties            # Configuración de exclusiones de SonarCloud Automatic Analysis
├── sonar-project.properties          # Configuración de SonarCloud / SonarScanner CI
├── docker-compose.yml                # Stack multi-contenedor de producción (Backend + Frontend)
├── docker-compose.dev.yml            # Overlay de desarrollo local con recarga en vivo
├── docker-compose.monitoring.yml     # Stack de observabilidad (Prometheus + Grafana + Blackbox)
├── docs/
│   ├── EP3_DOY0101_Estudiante.pdf    # Enunciado y rúbrica oficial de la evaluación (EP3)
│   ├── CHECKLIST_EP3.md              # Matriz de delegación, verificación y checklist 100%
│   ├── TOMA_DE_DECISIONES.md         # Informe técnico (IE4), métricas operativas y ética de IA
│   ├── POLITICAS_CUMPLIMIENTO_Y_AUDITORIA_IE5.md # Políticas de calidad y Branch Protection (IE5)
│   ├── PROTOCOLO_PRUEBA_FAIL_SAFE_IE6.md         # Protocolo y evidencia de falla crítica (IE6)
│   ├── EVIDENCIAS_IE2_PAULO_RIVAS.md             # Evidencias de infraestructura AWS y K8s (IE2)
│   ├── KEVIN_ENTREGA_EP3.md                      # Informe de entrega de observabilidad (IE1 e IE3)
│   ├── KEVIN_ANALISIS_OBSERVABILIDAD.md          # Análisis de telemetría y correlación operativa
│   ├── KEVIN_DASHBOARD_IE3.md                    # Especificación de paneles de Grafana
│   ├── KEVIN_METRICAS.md                         # Catálogo de métricas y consultas PromQL
│   ├── KEVIN_STACK_MONITOREO.md                  # Arquitectura del stack Prometheus/Grafana
│   ├── KEVIN_LOGGING.md                          # Pipeline y formato de logs estructurados
│   └── evidencias/                               # 10 Capturas PNG de alta resolución (IE4-IE6)
├── backend/                          # Microservicio Backend REST MVC (Node.js)
│   ├── src/
│   │   ├── controllers/              # Controladores de catálogo y órdenes
│   │   ├── middleware/               # Logger HTTP estructurado y CORS
│   │   ├── observability/            # Métricas Prometheus (/metrics) y logger JSON
│   │   ├── router.js                 # Enrutador REST nativo
│   │   └── server.js                 # Servidor HTTP con healthcheck (/api/health, /healthz)
│   ├── tests/
│   │   ├── backend.test.js           # 10 Pruebas unitarias de endpoints y negocio
│   │   └── observability.test.js     # 2 Pruebas de telemetría y logging estructurado
│   ├── Dockerfile                    # Contenerización Multi-Stage con usuario no-root
│   └── package.json                  # Scripts y dependencias (prom-client)
├── frontend/                         # Cliente Web SPA y Servidor Gateway (Node.js)
│   ├── public/                       # Shell HTML e iconos
│   ├── src/                          # Componentes, vistas SPA, catálogo y store
│   ├── observability/                # Métricas (/metrics), logger y trace propagation
│   ├── tests/
│   │   ├── frontend.test.js          # 10 Pruebas unitarias de componentes e interfaz
│   │   └── observability.test.js     # 6 Pruebas del servidor gateway, salud y proxy
│   ├── Dockerfile                    # Contenerización Multi-Stage
│   └── package.json                  # Scripts y dependencias
├── k8s/                              # Manifiestos declarativos Kubernetes en AWS (Paulo Rivas)
│   ├── namespace.yaml                # Namespace aislado vicity
│   ├── backend-deployment.yaml       # Deployment Backend con resource limits y probes
│   ├── backend-service.yaml          # ClusterIP backend (puerto 3000)
│   ├── frontend-deployment.yaml      # Deployment Frontend con probes
│   ├── frontend-service.yaml         # NodePort frontend (puerto 80 / 30080)
│   ├── ingress.yaml                  # Enrutamiento Ingress / y /api
│   └── kustomization.yaml            # Consolidación de recursos
├── observability/                    # Stack completo de observabilidad (Kevin Gallardo)
│   ├── prometheus/                   # Configuración y reglas de alertas PromQL
│   ├── grafana/                      # Dashboards aprovisionados (ep3-kevin-gallardo.json)
│   ├── logging/                      # Pipeline de recolección FluentBit
│   ├── blackbox/                     # Configuración de probes HTTP Blackbox Exporter
│   └── kubernetes/                   # ServiceMonitors y scrape configs
└── scripts/ie3/                      # Scripts de validación PromQL y extracción LCOV
```

---

## ⚙️ Ejecución y Pruebas Locales

### Requisitos Previos
* [Node.js](https://nodejs.org/) v18+ (LTS recomendado).
* [Docker](https://www.docker.com/) y Docker Compose instalados.
* [Git](https://git-scm.com/) configurado localmente.

### 1. Ejecución de Pruebas Unitarias
Ambas suites utilizan el motor nativo de pruebas de Node.js (`node --test`), ejecutándose sin dependencias externas complejas (28 pruebas automatizadas en total):
```bash
# Probar el microservicio Backend (12 pruebas: endpoints + observabilidad)
cd backend
npm test

# Probar la interfaz Frontend (16 pruebas: componentes SPA + gateway estático + métricas)
cd ../frontend
npm test
```

### 2. Cobertura de pruebas (IE2)

Cada módulo conserva `npm test` y expone `npm run test:coverage`, que genera salida legible y LCOV mediante `c8`:

```bash
cd backend && npm run test:coverage
cd ../frontend && npm run test:coverage
```

Los reportes quedan en `backend/coverage/lcov.info` y `frontend/coverage/lcov.info`. `coverage/` está excluido de Git y Docker.

### 3. Levantamiento con Docker Compose (Orquestación Local)

#### 3.1 Modo producción (imágenes inmutables)

Construye las imágenes desde los `Dockerfile` y levanta el stack en una red aislada con healthchecks activos:

```bash
docker compose up --build -d
```

* **Frontend:** Disponible en `http://localhost:5000`
* **Backend API:** Disponible en `http://localhost:3000/api`
* **Healthcheck:** Verificar estado en `http://localhost:3000/api/health`

En este modo el código queda **horneado dentro de la imagen** (`COPY` en el `Dockerfile`). Si modificas un archivo, debes reconstruir:

```bash
docker compose up --build -d
```

#### 3.2 Modo desarrollo (recarga en vivo)

Para iterar sin reconstruir imágenes, el overlay `docker-compose.dev.yml` monta el código del host dentro de los contenedores:

```bash
npm run dev        # primer plano, con logs
npm run dev:up     # en segundo plano
```

Equivale a:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Servicio | Montaje | Efecto |
| :--- | :--- | :--- |
| **Frontend** | `./frontend/src` → `/app/src` | Los módulos ES y el CSS se leen del disco en cada request: guardas y recargas el navegador |
| **Frontend** | `./frontend/public` → `/app/public` | `index.html` se sirve actualizado |
| **Frontend** | `./frontend/server.js` → `/app/server.js` | Cambios en el servidor estático requieren `docker compose restart frontend` |
| **Backend** | `./backend/src` → `/app/src` | `node --watch` reinicia el proceso automáticamente al guardar |

En desarrollo el servidor envía `Cache-Control: no-cache`, de modo que el navegador no muestra versiones antiguas.

El pipeline de CI **no** usa este overlay: sigue construyendo y validando las imágenes de producción con `docker-compose.yml` (IE1 e IE4).

#### 3.3 Comandos útiles

```bash
npm run ps         # estado de los servicios
npm run logs       # logs en streaming
npm run smoke      # healthcheck + frontend en una línea
npm run down       # detener el stack
```

---

## 📊 Matriz de Cumplimiento de Rúbrica EP3 (100% Muy Buen Desempeño)

Para el detalle completo de tareas, responsables, comandos de prueba y criterios de verificación, consultar la matriz maestra en [**`docs/CHECKLIST_EP3.md`**](./docs/CHECKLIST_EP3.md).

| Indicador | Ponderación | Responsable | Criterio de Logro (100% Muy Buen Desempeño) | Estado |
| :--- | :---: | :---: | :--- | :---: |
| **IE1: Monitoreo & Logs** | **20%** | **Kevin** | Herramientas como Prometheus o AWS CloudWatch configuradas con visualización de logs estructurados, métricas de uso, errores y disponibilidad de todos los microservicios. | 🟢 Completado |
| **IE2: Despliegue K8s AWS** | **20%** | **Paulo** | Despliegue eficaz de microservicios en clúster Kubernetes en AWS con configuraciones automatizadas de monitoreo, trazabilidad y observabilidad. | 🟢 Completado |
| **IE3: Dashboards CI/CD** | **10%** | **Kevin** | Dashboards funcionales con las 4 métricas clave (tiempo de despliegue, cobertura, CPU/RAM, errores) integrados al proceso CI/CD. | 🟢 Completado |
| **IE4: Documentación Técnica** | **10%** | **Alexsander** | Documentación clara de la integración de herramientas y justificación fundada de su aporte a la toma de decisiones técnicas. | 🟢 Completado |
| **IE5: Cumplimiento y Auditoría**| **20%** | **Alexsander** | Políticas rigurosas con SonarCloud (`pruebaDevops3`), Branch Protection Rules y auditorías de seguridad automatizadas. | 🟢 Completado |
| **IE6: Bloqueo Fallas Críticas** | **20%** | **Alexsander** | Mecanismos de validación automatizados que interrumpen el pipeline ante fallas críticas de seguridad o calidad (fail-on-error). | 🟢 Completado |

> 📁 **Evidencias y Verificación Técnica:**
> Todas las evidencias de ejecución, capturas y salidas de consola requeridas por la rúbrica se gestionan en [**`docs/CHECKLIST_EP3.md`**](./docs/CHECKLIST_EP3.md) y se almacenan en el directorio [**`docs/evidencias/`**](./docs/evidencias/).

---

## 🔍 Trazabilidad, Gobernanza y Toma de Decisiones Técnicas (IE4)

La trazabilidad del ciclo de vida en esta etapa vincula el desarrollo, las compuertas de seguridad, el despliegue orquestado y la observabilidad en tiempo real:

1. **Trazabilidad de Código a Clúster:** Cada imagen y despliegue en Kubernetes se etiqueta con el hash SHA del commit (`$GITHUB_SHA`) y la rama de trabajo, garantizando correlación directa entre código y pods en ejecución.
2. **Compuertas de Calidad y Cumplimiento Normativo (IE5 & IE6):** Ningún artefacto avanza a la etapa de despliegue en la nube sin superar las pruebas unitarias automatizadas y el Quality Gate estricto de SonarCloud con cero vulnerabilidades críticas.
3. **Observabilidad para Toma de Decisiones Técnicas:** Los dashboards personalizados consolidan métricas clave de consumo de recursos y tasas de error, permitiendo decisiones proactivas sobre autoescalado horizontal (HPA), límites de memoria y rollbacks automatizados.
4. **Auditoría Continua e Inmutable:** Cada ejecución en GitHub Actions genera registros de despliegue auditables con autor, timestamp UTC y verificación de salud de los endpoints.

---

## 🤖 Declaración de Uso Ético de Inteligencia Artificial

En cumplimiento con la política institucional de Duoc UC sobre el uso ético de tecnologías de inteligencia artificial:
* **Herramientas empleadas:** Antigravity CLI / Asistente IA.
* **Finalidad:** Apoyo en redacción estructurada, generación de diagramas Mermaid y estructuración de checklists técnicos de verificación.
* **Autoría y Responsabilidad:** Todas las ideas, análisis, configuraciones de infraestructura en AWS, métricas y decisiones técnicas son de autoría y responsabilidad exclusiva del equipo de estudiantes.

---

## ✍️ Reflexiones Individuales de Aprendizaje (Obligatorias - EP3)

> *Nota institucional:* Sección obligatoria redactada de manera individual por cada integrante sin asistencia de IA al culminar la evaluación, detallando su aprendizaje en observabilidad, orquestación en la nube y gobernanza DevOps.

### 1. Reflexión de Alexsander Rosales (Tech Lead, Security & Governance Engineer)
A lo largo de este proyecto en **DOY0101**, asumir el rol de Tech Lead y responsable de la gobernanza y seguridad del pipeline me ha permitido comprender que DevOps no es simplemente la automatización de despliegues rápidos, sino la construcción de una disciplina de ingeniería donde la **confiabilidad, la prevención y la trazabilidad** son principios innegociables.

Uno de los aprendizajes más profundos que obtuve fue comprender el verdadero valor del paradigma **Shift-Left Security**. Al implementar herramientas como **SonarCloud** y `npm audit` integradas de forma nativa en el flujo de GitHub Actions con un **Quality Gate estricto**, experimenté cómo la seguridad se transforma en una compuerta objetiva. Ver cómo el pipeline se interrumpe de manera incondicional ante una vulnerabilidad crítica (con código de salida `exit 1`), bloqueando físicamente el botón de merge a través de las Branch Protection Rules de GitHub, me demostró que el software seguro no se logra confiando en la buena voluntad de las personas, sino diseñando sistemas con arquitectura **fail-safe**: sistemas donde el fallo es visible de inmediato y la propagación del riesgo hacia producción resulta matemáticamente imposible.

En el ámbito de la observabilidad, entender la correlación entre métricas operativas y calidad de código cambió mi perspectiva técnica. Una compuerta de calidad no termina cuando el código se despliega; continúa a través de la telemetría de Prometheus y CloudWatch. Diagnosticar cómo un error en el manejo del *Event Loop* o una fuga de memoria puede derivar en una degradación masiva de latencia o en la muerte de un contenedor por *OOMKilled* me enseñó que las métricas de observabilidad son la única fuente de verdad empírica para fundamentar decisiones complejas, tales como ordenar un rollback automatizado o redefinir los límites de CPU y memoria de un pod.

Finalmente, coordinar las responsabilidades con Kevin (en dashboards y métricas) y Paulo (en la orquestación cloud con Kubernetes en AWS) representó un ejercicio de madurez profesional. Aprender a definir contratos claros de integración (como la exposición estandarizada del endpoint `/metrics` y las comprobaciones de salud en `/api/health`) fue la clave para que la infraestructura y el código ensamblaran sin fisuras. Esta experiencia en Duoc UC consolida mi convicción de que un ingeniero DevOps de excelencia debe ser capaz de fusionar una visión holística de la arquitectura de software con el rigor técnico necesario para proteger el negocio y los usuarios finales.

### 2. Reflexión de Kevin (Observability & Dashboards Engineer)
> *[Espacio reservado para redacción individual al cierre del encargo EP3]*

### 3. Reflexión de Paulo Rivas (Cloud & Infrastructure Engineer - AWS Specialist)
Durante el desarrollo de esta Evaluación Parcial 3, consolidé la transición desde la orquestación básica con contenedores hacia un entorno cloud-native orquestado con Kubernetes sobre infraestructura elástica en AWS. Aprovisionar el clúster de control-plane, definir manifiestos declarativos desacoplados para backend y frontend con sondas de salud (liveness y readiness probes) y configurar límites estrictos de CPU y memoria me permitió comprender la importancia de la alta disponibilidad y la resiliencia en arquitecturas productivas. Asimismo, vincular el monitoreo nativo a través del agente de CloudWatch y la exposición balanceada de servicios demostró que el aprovisionamiento de infraestructura moderno debe concebirse de manera inseparable con la observabilidad continua. Esta experiencia reforzó mi capacidad para estructurar despliegues automatizados, auditables y gobernados bajo estándares DevOps reales.
