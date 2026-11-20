# Métricas de Vicity en Kubernetes

Estas plantillas son alternativas para integrar Vicity con el **Prometheus existente**. No instalan Prometheus, Grafana, Operator ni CRD. No se consultó ni se desplegó en ningún clúster. Los `.example` no deben incluirse directamente en la automatización de despliegue.

## Acordar con Paulo antes de integrar

- Confirmar namespaces, nombres y labels reales de los **Services**, así como los nombres de sus puertos (`Service.spec.ports[].name`) y el mapeo hacia los contenedores. No se verificaron en Kubernetes. El repositorio documenta HTTP `GET /metrics` en ambos procesos (backend `3000`, frontend `5000`); no asumir que sean los puertos publicados por los Services. `/api/metrics` del backend devuelve JSON de negocio y no se debe usar para scrape.
- Confirmar quién administra Prometheus, si alguno de los endpoints ya se recolecta y qué esquema, autenticación, intervalo y conectividad se requieren. Sustituir todos los marcadores `replace-*` y usar **una sola vía por endpoint**. No añadir jobs si el stack ya recoge esas métricas.

## Elegir una vía

- **Con Operator:** usar `servicemonitor.yaml.example` solo cuando Paulo confirme que la CRD `servicemonitors.monitoring.coreos.com` ofrece `monitoring.coreos.com/v1` y que el Prometheus existente selecciona el namespace y las etiquetas de los monitores (`serviceMonitorNamespaceSelector` y `serviceMonitorSelector`). Las etiquetas de `metadata.labels` son del monitor; las de `spec.selector.matchLabels` seleccionan el Service, no el Pod. Adaptar los dos documentos por separado si los Services están en namespaces distintos.
- **Sin Operator:** incorporar únicamente los jobs de `scrape-configs.yaml.example` al `scrape_configs` existente, con nombres únicos. Requiere una versión de Prometheus compatible con descubrimiento `endpointslice`, acceso a la API y permisos de lectura (`get`, `list`, `watch`) para EndpointSlices, Services y Pods en los namespaces de destino. La plantilla filtra por Service, nombre de puerto, endpoint listo e IPv4 para recolectar por réplica, no a través del balanceo del Service. Adaptar el filtro a `IPv6` si corresponde; en dual-stack elegir una familia para no recolectar dos veces la misma réplica. Si Prometheus está fuera del clúster, acordar con Paulo acceso autenticado a la API y conectividad hacia los endpoints privados; la plantilla no configura ese acceso.

## Seguridad y validación

- No publicar `/metrics` en Ingress, Gateway o balanceadores públicos. Como comparte puerto con la aplicación, bloquear la **ruta** en la capa HTTP pública: una NetworkPolicy filtra por red/puerto, no por ruta. Restringir el acceso interno según la topología, conservando el tráfico legítimo de la aplicación y el scrape desde Prometheus.
- `scheme: http` es un supuesto para tráfico privado; adaptar a HTTPS y validar certificados si la plataforma lo requiere. No guardar tokens ni claves en Git; reutilizar el mecanismo de secretos del stack y aplicar RBAC de mínimo privilegio.
- Antes de integrar, revisar localmente los YAML renderizados y comprobar la configuración completa sin Operator con `promtool check config`. Tras un cambio autorizado, Paulo puede comprobar en el Prometheus existente que el número de targets coincide con las réplicas listas, que `up` vale `1` para cada target esperado y que no hay duplicados.
- Si se conectan dashboards de Grafana, referenciar el datasource existente por UID `vicity-prometheus` y confirmar con Paulo que apunta al Prometheus que recolecta estos targets. No se aprovisiona otro datasource.
