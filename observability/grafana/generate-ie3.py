"""Regenerate the checked-in Grafana dashboard; no external dependencies."""
import json
from pathlib import Path

APP, CI = 'vicity-prometheus', 'vicity-ci-history'
DASHBOARD = Path(__file__).parent / 'dashboards' / 'ep3-kevin-gallardo.json'
panels, y = [], 0


def row(title):
    global y
    panels.append(dict(id=len(panels)+1, type='row', title=title, collapsed=False,
                       gridPos=dict(x=0, y=y, w=24, h=1), panels=[]))
    y += 1


def panel(title, uid, query, legend, unit, description, x=0, kind='timeseries'):
    ds = dict(type='prometheus', uid=uid)
    options = (dict(reduceOptions=dict(calcs=['lastNotNull'], fields='', values=False),
                    graphMode='none', textMode='value_and_name') if kind == 'stat' else
               dict(legend=dict(displayMode='list', placement='bottom'), tooltip=dict(mode='multi')))
    panels.append(dict(id=len(panels)+1, type=kind, title=title, description=description,
                       datasource=ds, gridPos=dict(x=x, y=y, w=12, h=8), options=options,
                       fieldConfig=dict(defaults=dict(unit=unit, noValue='Sin datos'), overrides=[]),
                       targets=[dict(datasource=ds, refId='A', expr=query, legendFormat=legend,
                                     instant=kind == 'stat', range=kind != 'stat')]))


row('01 · Despliegues | GitHub Actions')
deploy = 'vicity_ci_deployment_duration_seconds{branch=~"${branch:regex}",environment=~"${deploy_environment:regex}"}'
legend = '{{environment}} · {{branch}} · {{result}}'
panel('Duración histórica del job de despliegue', CI, f'last_over_time({deploy}[$__interval])', legend, 's',
      'Inicio → fin del job GitHub Actions; no certifica disponibilidad ni rollout. Resultado según GitHub.')
last_time = f'timestamp(last_over_time({deploy}[$__range]))'
latest = f'last_over_time({deploy}[$__range]) and ({last_time} == on(environment,branch) group_left max by (environment,branch) ({last_time}))'
panel('Último despliegue por entorno y rama', CI, latest, legend, 's',
      'Última muestra en el rango, aun si falló. timestamp(last_over_time) usa el timestamp de la muestra disponible; muestra empates si los timestamps coinciden.', 12, 'stat')
y += 8
row('02 · Calidad | Cobertura de líneas c8 / LCOV')
coverage = 'vicity_ci_test_coverage_percent{branch=~"${branch:regex}",service=~"${service:regex}"}'
panel('Cobertura histórica', CI, f'last_over_time({coverage}[$__interval])', '{{service}} · {{branch}}', 'percent', '100 × líneas cubiertas / líneas instrumentadas, por módulo.')
panel('Última cobertura por módulo', CI, f'last_over_time({coverage}[$__range])', '{{service}} · {{branch}}', 'percent', 'Último reporte disponible en el rango; ausente no significa 0%.', 12, 'stat')
y += 8
row('03 · Kubernetes | Recursos de contenedor (no proceso)')
filters = 'environment=~"${environment:regex}",namespace=~"${namespace:regex}",container=~"${service:regex}",container!="",container!="POD",pod!=""'
# Map service to container by naming convention; update if Paulo uses different names.
group = 'environment,namespace,pod,container'
cpu = f'sum by ({group}) (rate(container_cpu_usage_seconds_total{{{filters}}}[$__rate_interval]))'
mem = f'sum by ({group}) (container_memory_working_set_bytes{{{filters}}})'
label = '{{environment}} · {{namespace}}/{{pod}} · {{container}}'
panel('CPU por contenedor', APP, cpu, label, 'cores', 'kubelet/cAdvisor; segundos de CPU por segundo.')
panel('Memoria working set por contenedor', APP, mem, label, 'bytes', 'kubelet/cAdvisor; no es RSS del proceso Node.js.', 12)
y += 8
for resource, usage, x in [('cpu', cpu, 0), ('memory', mem, 12)]:
    denominator = f'max by ({group}) (kube_pod_container_resource_requests{{{filters},resource="{resource}"}})'
    panel(f'{resource.upper()} / request', APP, f'100 * ({usage}) / ({denominator} > 0)', label, 'percent',
          'Requiere kube-state-metrics y requests positivos; puede superar 100%. Sin request no se grafica.', x)
y += 8
for resource, usage, x in [('cpu', cpu, 0), ('memory', mem, 12)]:
    denominator = f'max by ({group}) (kube_pod_container_resource_limits{{{filters},resource="{resource}"}})'
    panel(f'{resource.upper()} / limit', APP, f'100 * ({usage}) / ({denominator} > 0)', label, 'percent',
          'Requiere kube-state-metrics y límites positivos; sin límite no se grafica.', x)
y += 8
row('04 · Aplicación | HTTP y disponibilidad')
match = 'service=~"${service:regex}",environment=~"${environment:regex}",namespace=~"${namespace:regex}"'
by = 'service,environment,namespace'
req = f'sum by ({by}) (rate(vicity_http_requests_total{{{match}}}[$__rate_interval]))'
err = f'sum by ({by},status_class) (rate(vicity_http_errors_total{{{match}}}[$__rate_interval]))'
label = '{{service}} · {{environment}} · {{namespace}}'
panel('Respuestas 4xx / 5xx por segundo', APP, err, label + ' · {{status_class}}', 'reqps', 'Contadores de aplicación separados por clase.')
panel('Porcentaje de errores por clase', APP, f'100 * ({err}) / ignoring(status_class) group_left() ({req} > 0)', label + ' · {{status_class}}', 'percent', 'Respuestas de cada clase / total; no calcula porcentaje sin tráfico.', 12)
y += 8
panel('Peticiones por segundo', APP, req, label, 'reqps', 'Puede contar la misma petición en el proxy y el backend; las series se mantienen separadas.')
panel('Latencia HTTP p95', APP, f'histogram_quantile(0.95, sum by ({by},le) (rate(vicity_http_request_duration_seconds_bucket{{{match}}}[$__rate_interval])))', label, 's', 'Estimación a partir del histograma de duración.', 12)
y += 8
panel('Scrape UP / DOWN (1 / 0)', APP, f'up{{{match},service!=""}}', label + ' · {{instance}}', 'none', 'Estado del scrape, no garantiza disponibilidad HTTP.')
panel('Sonda HTTP (1 / 0)', APP, f'probe_success{{{match}}}', label + ' · {{check}}', 'none', 'Blackbox Exporter; en AWS solo si hay sondas configuradas.', 12)


def variable(name, label, query, uid):
    return dict(name=name, label=label, type='query', datasource=dict(type='prometheus', uid=uid),
                query=query, definition=query, refresh=1, includeAll=True, multi=True, allValue='.*',
                current=dict(selected=True, text='All', value='$__all'), options=[])


variables = [
    dict(name='service', label='Servicio', type='custom', query='backend,frontend', includeAll=True,
         multi=True, allValue='backend|frontend', current=dict(text='All', value='$__all')),
    variable('environment', 'Entorno de runtime', 'label_values(up, environment)', APP),
    variable('namespace', 'Namespace (All incluye local)', 'label_values(up, namespace)', APP),
    variable('branch', 'Rama CI', 'label_values({__name__=~"vicity_ci_.*"}, branch)', CI),
    variable('deploy_environment', 'Entorno de despliegue', 'label_values(vicity_ci_deployment_duration_seconds, environment)', CI),
]
dashboard = dict(uid='ep3-kevin-gallardo', title='EP3 | Observabilidad & CI/CD | Kevin Gallardo',
                 description='IE3 · Las fuentes no conectadas no generan muestras. Consultar docs/KEVIN_DASHBOARD_IE3.md.',
                 schemaVersion=41, version=1, editable=True, style='dark', tags=['ep3', 'ie3', 'vicity'],
                 timezone='browser', refresh='30s', time=dict(**{'from': 'now-7d', 'to': 'now'}),
                 templating=dict(list=variables), panels=panels)
DASHBOARD.write_text(json.dumps(dashboard, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
