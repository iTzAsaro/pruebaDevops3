"""Static PromQL validation for the official IE3 dashboard. No network or cluster access."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DASHBOARD = ROOT / 'observability' / 'grafana' / 'dashboards' / 'ep3-kevin-gallardo.json'
PROMTOOL = Path(sys.argv[1])

dashboard = json.loads(DASHBOARD.read_text(encoding='utf-8'))
groups = []
for panel in dashboard['panels']:
    if panel.get('type') == 'row':
        continue
    expression = panel['targets'][0]['expr']
    for name in ('service', 'environment', 'namespace', 'branch', 'deploy_environment'):
        expression = expression.replace(f'${{{name}:regex}}', '.*')
    for macro in ('$__rate_interval', '$__interval', '$__range'):
        expression = expression.replace(macro, '5m')
    groups.append({'name': f"panel-{panel['id']}", 'rules': [{'record': f"qa:panel_{panel['id']}", 'expr': expression}]})

with tempfile.TemporaryDirectory() as directory:
    rules = Path(directory) / 'ie3-dashboard.rules.yml'
    rules.write_text(json.dumps({'groups': groups}), encoding='utf-8')
    result = subprocess.run([PROMTOOL, 'check', 'rules', rules], capture_output=True, text=True)
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    sys.exit(result.returncode)
