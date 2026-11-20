# Fluent Bit → CloudWatch Logs (candidato)

Solo configuración; no incluye despliegue, recursos de AWS, IAM ni credenciales. No usar como configuración general de logs del clúster.

## Alcance y contrato

| Campo del pod | Valor admitido |
| --- | --- |
| Namespace | `vicity`, documentado en [CHECKLIST_EP3](../../docs/CHECKLIST_EP3.md) |
| Etiqueta `app` del pod | `backend` o `frontend` |
| Nombre del contenedor de aplicación | `backend` o `frontend` |

Los nombres de aplicación corresponden a los servicios de [docker-compose.yml](../../docker-compose.yml). Los valores de la etiqueta `app` y los nombres de contenedor son un **contrato candidato de Kubernetes**, no valores verificados en un clúster. Confirmarlos en `spec.template` de los manifiestos antes de adoptar la configuración. Si cambian, actualizar las rutas de `pipeline.conf`, la selección y las pruebas juntas; no ampliar la captura a `*.log`.

`tail` solo abre rutas con sufijo de namespace y contenedor permitidos bajo `/var/log/containers`. El parser multiline integrado `cri` interpreta el formato CRI y recompone fragmentos parciales. El filtro Kubernetes añade metadatos; `grep` exige las tres condiciones exactas y descarta registros sin metadatos requeridos. No se lee journald ni se habilitan parsers por anotación. No es una frontera contra quienes pueden crear o etiquetar pods dentro de `vicity` con los valores admitidos.

## Requisitos para una futura integración

- Fluent Bit moderno (usar una versión aprobada de la serie 4.2 o posterior para validar); necesita `tail`, el parser multiline `cri`, `kubernetes`, `grep` y `cloudwatch_logs`. Cargar `fluent-bit.conf` con sus ficheros incluidos en el mismo directorio.
- Lectura de los enlaces de `/var/log/containers` y de sus destinos en el nodo (habitualmente `/var/log/pods`) en las rutas originales. Sin acceso a metadatos de pods, la selección no deja pasar registros. No se configuran permisos aquí.
- Definir `AWS_REGION` y `CLOUDWATCH_LOG_GROUP` externamente. El grupo debe existir en esa región (`auto_create_group Off`); acordar nombre y retención antes de integrar. Los streams usan el prefijo `cri-` seguido del tag por archivo de contenedor.
- No hay secretos en los archivos. El contenido de `stdout`/`stderr` admitido se reenvía sin redactar: las aplicaciones no deben registrar credenciales ni datos sensibles. No hay persistencia de offsets ni de buffers; esta propuesta no garantiza entrega durante reinicios o interrupciones. `Read_from_Head Off` evita el envío inicial del historial existente.

## Validación local, sin clúster ni AWS

Desde este directorio, con Fluent Bit instalado (ejemplo PowerShell):

```powershell
$env:AWS_REGION = 'us-east-1'
$env:CLOUDWATCH_LOG_GROUP = '/example/vicity/candidate'
fluent-bit --dry-run -c fluent-bit.conf
fluent-bit -c validate-selection.conf
```

El primer comando debe validar la configuración sin arrancar el pipeline; los valores son ficticios. El segundo usa datos sintéticos y la **misma** selección, escribiendo solo a `stdout`. Detener con Ctrl+C tras el primer flush que muestre `PASS-backend` y `PASS-frontend`; no debe aparecer ningún registro `DROP-*` en la salida. Esta prueba no valida la lectura de archivos CRI, el acceso a metadatos ni la entrega a CloudWatch. Antes de adoptar, comprobar esos pasos con mensajes inocuos en un entorno autorizado: uno por aplicación admitida y controles negativos de otro namespace, otra etiqueta y un sidecar.
