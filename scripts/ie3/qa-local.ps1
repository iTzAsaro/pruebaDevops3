$ErrorActionPreference = 'Stop'
$dest = Join-Path $PSScriptRoot '../../docs/evidencias'
function Get-Local($url) { Invoke-RestMethod -TimeoutSec 10 -Uri $url }
function Save-Json($name,$value) { ConvertTo-Json -Depth 60 -InputObject $value | Set-Content -Encoding UTF8 (Join-Path $dest $name) }
function Query($expr) { Get-Local ('http://127.0.0.1:9090/api/v1/query?query=' + [uri]::EscapeDataString($expr)) }
$dc=@('--env-file','.env.monitoring.local','-p','vicity-ep3-qa','-f','docker-compose.yml','-f','docker-compose.monitoring.yml')
foreach($pair in @(@('backend',3000,'/api/health'),@('frontend',5000,'/healthz'))) {
  $base = "http://127.0.0.1:$($pair[1])"
  $health=Get-Local ($base+$pair[2]); if ($health.status -ne 'ok') { throw 'Health failed' }
  $m=Invoke-WebRequest -UseBasicParsing -Uri "$base/metrics"; if ($m.Content -notmatch 'vicity_http_requests_total') { throw 'Metrics missing' }
  $m.Content | Set-Content -Encoding UTF8 (Join-Path $dest "IE1_01_$($pair[0]).txt")
}
$targets=Get-Local 'http://127.0.0.1:9090/api/v1/targets'; Save-Json 'IE1_02_targets.json' $targets
$apps=@($targets.data.activeTargets | Where-Object {$_.labels.job -eq 'vicity-apps' -and $_.health -eq 'up'}); if($apps.Count -ne 2){throw 'Expected two UP app targets'}
$before=Query 'sum by(service)(vicity_http_requests_total)'
$ids=@()
foreach($i in 1..20) {
  $id=[guid]::NewGuid().ToString(); $ids+=$id
  $response=Invoke-WebRequest -UseBasicParsing -Headers @{'X-Request-Id'=$id} -Uri 'http://127.0.0.1:5000/api/catalog'; if ($response.Headers['X-Request-Id'] -ne $id) { throw 'Correlation failed' }
}
$status=curl.exe -s -o NUL -w '%{http_code}' http://127.0.0.1:5000/api/qa-no-existe
if ($status -ne '404') { throw 'Expected 404' }
Start-Sleep -Seconds 17
$logs=@(foreach ($container in 'devops_backend','devops_frontend') { docker logs $container | Where-Object { $_ -match '^\{' } })
$logs=@($logs | Where-Object { $_ -match '^\{' } | ForEach-Object { ConvertFrom-Json $_ })
$matched=@($logs | Where-Object { $_.requestId -in $ids -or ($_.statusCode -eq 404 -and $_.route -in 'unmatched','api_proxy') })
foreach($svc in 'backend','frontend'){ if(!($matched | Where-Object {$_.service -eq $svc -and $_.requestId -in $ids -and $_.statusCode -eq 200 -and $_.level -eq 'INFO' -and $_.timestamp})){throw "Missing correlated logs: $svc"} }
Save-Json 'IE1_03_logs.json' $matched
Save-Json 'IE1_04_prometheus.json' @{before=$before;after=(Query 'sum by(service)(vicity_http_requests_total)');availability=(Query 'probe_success');latency=(Query 'histogram_quantile(0.95,sum by(service,le)(rate(vicity_http_request_duration_seconds_bucket[5m])))');errors=(Query 'vicity_http_errors_total');process_cpu=(Query 'process_cpu_seconds_total');process_rss=(Query 'process_resident_memory_bytes')}
$vars=(Get-Content .env.monitoring.local | Where-Object { $_ -match '^GRAFANA_ADMIN_(USER|PASSWORD)=' }) -join "`n" | ConvertFrom-StringData
$user=if($vars.GRAFANA_ADMIN_USER){$vars.GRAFANA_ADMIN_USER}else{'admin'}
$auth=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${user}:$($vars.GRAFANA_ADMIN_PASSWORD)"))
$headers=@{Authorization="Basic $auth"}
$g='http://127.0.0.1:3001'
$ds=Invoke-RestMethod -Uri "$g/api/datasources/uid/vicity-prometheus/health" -Headers $headers
$export=Invoke-RestMethod -Uri "$g/api/dashboards/uid/ep3-kevin-gallardo" -Headers $headers
$panels=@($export.dashboard.panels | Where-Object type -ne 'row'); if($panels.Count -ne 16){throw 'Expected 16 panels'}
Save-Json 'IE3_02_consultas.json' @($panels | ForEach-Object { @{id=$_.id; title=$_.title; query=$_.targets[0].expr} })
Save-Json 'IE3_03_dashboard.json' $export.dashboard
Save-Json 'IE3_datasource_health.json' $ds
