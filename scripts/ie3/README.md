# IE3: métricas históricas de CI

En **Actions → IE3 - Métricas de CI → Run workflow**, selecciona la rama por defecto y proporciona el `run_id` de `ci.yml` y su `attempt` exacto. Solo acepta intentos completados del mismo repositorio. Con `publish=false` (por defecto) no hay conexión a VictoriaMetrics. Descarga el artefacto `ie3-metrics-*`: contiene `ie3-metrics.prom` y `ie3-metadata.json` (run ID, intento, SHA, URLs, jobs, reportes, omisiones y estado de publicación).

## Contrato

| Métrica | Etiquetas | Valor / timestamp Unix en ms |
|---|---|---|
| `vicity_ci_deployment_duration_seconds` | `branch`, `result`, `environment` (`simulated` / `aws`) | Duración del **job**, desde `started_at` hasta `completed_at` (timestamp de la muestra). Solo si hay evidencia de que el paso de despliegue empezó; un job AWS exitoso sin secretos no cuenta. `result` es la conclusión GitHub del job, no confirmación de rollout ni de disponibilidad. El job incluye preparación, pruebas y limpieza cuando aplican. |
| `vicity_ci_pipeline_duration_seconds` | `branch`, `result` | Tiempo de pared del intento entre el inicio del primer job ejecutado y el final del último; no incluye la cola inicial, sí los intervalos entre jobs. Timestamp: fin del último job ejecutado. `result` es la conclusión del intento. En reruns parciales no incluye jobs de intentos anteriores. |
| `vicity_ci_test_coverage_percent` | `branch`, `service` (`backend` / `frontend`) | Cobertura de líneas `100 × sum(LH) / sum(LF)` del LCOV. Timestamp: fin del paso de generación exitoso. Reporte ausente, inválido o ambiguo se omite, nunca equivale a 0 %. |

`branch` es `head_branch` de GitHub (en PR, la rama de origen). No hay etiquetas de run, intento, SHA ni URLs. Los timestamps proceden de la API de jobs por intento, no del reloj del colector. Los jobs `skipped` o `neutral` no cuentan. Se omite la duración del pipeline si no hay timestamps suficientes para determinarla. Los nombres actuales de jobs/pasos de `ci.yml` son parte del contrato.

## Atribución y seguridad

No se modificó `ci.yml`: ya genera y sube `coverage-backend` y `coverage-frontend`, con `lcov.info` en la raíz del ZIP y retención de 14 días. La API lista artefactos por **run**, no por intento. Para no mezclar reportes, solo se considera cobertura cuando el intento 1 sigue siendo el único intento, se comprueba de nuevo tras recolectar y se exige que el artefacto se haya creado durante la ventana del upload/job correspondiente, con generación y upload exitosos. Si necesitas cobertura en reruns, el cambio mínimo futuro en `ci.yml` es añadir `github.run_attempt` a los nombres de ambos uploads y downloads, y adaptar el colector; los jobs no reejecutados deben quedarse sin cobertura para ese intento.

No se descarga ni ejecuta el checkout del run origen. El ZIP se descarga por HTTPS desde el redirect de la API sin reenviar `GH_TOKEN`; no se siguen redirects adicionales. `read-lcov.py` solo lee un miembro regular con nombre exacto `lcov.info`, sin extraer a disco ni ejecutar contenidos. Límites: 64 MiB comprimidos y 8 MiB de LCOV. El workflow tiene permisos de lectura de Actions y Contents.

## Publicación autorizada

1. Configura el environment `ie3-metrics-publish` con revisores requeridos y restringido a la rama por defecto. Protege esa rama. Configura en ese environment `VM_IMPORT_URL`, por ejemplo `https://vm.example.org/api/v1/import/prometheus`, y, si corresponde, el secret `VM_TOKEN` con permiso limitado de ingestión Bearer. No uses secrets de repositorio para este token.
2. Revisa primero el artefacto de un dry-run. Solo con autorización marca `publish=true` y aprueba el job. Se envía un POST HTTPS con timestamps explícitos y sin seguir redirects; no imprime credenciales ni cuerpo de respuesta. Verifica que la retención de VictoriaMetrics admita los timestamps históricos y comprueba las muestras en destino: un HTTP 2xx confirma la aceptación de la petición, no una lectura posterior.
3. No se garantiza exactamente una vez: una nueva publicación del mismo origen reenvía las mismas series y timestamps, y dos runs pueden coincidir en una serie y segundo. Evita republicar sin revisar el metadato `publication`; si el transporte falla, comprueba primero el destino. La deduplicación depende de VictoriaMetrics.

Pruebas offline (Node 20+; el workflow usa 22): `node --test scripts/ie3/collect.test.mjs`. El recolector necesita Node, `python3` y las variables `GITHUB_REPOSITORY`, `GH_TOKEN`, `SOURCE_RUN_ID`, `SOURCE_ATTEMPT`; sin `PUBLISH=true` solo genera archivos locales. `GH_TOKEN` requiere lectura de Actions. No se ha publicado ninguna muestra al implementar este mecanismo.
