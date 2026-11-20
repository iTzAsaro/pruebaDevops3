const { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } = require('prom-client');

const registry = new Registry();
registry.setDefaultLabels({ service: 'backend' });
collectDefaultMetrics({ register: registry });

const labels = ['method', 'route', 'status_code'];
const requests = new Counter({
  name: 'vicity_http_requests_total', help: 'Completed application HTTP responses',
  labelNames: labels, registers: [registry]
});
const duration = new Histogram({
  name: 'vicity_http_request_duration_seconds', help: 'Time until the HTTP response finishes',
  labelNames: labels, registers: [registry], buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});
const errors = new Counter({
  name: 'vicity_http_errors_total', help: 'Completed HTTP error responses by status class',
  labelNames: ['status_class'], registers: [registry]
});
for (const status_class of ['4xx', '5xx']) errors.inc({ status_class }, 0);
const uptimeGauge = new Gauge({
  name: 'vicity_process_uptime_seconds', help: 'Node.js process uptime in seconds', registers: [registry],
  collect() { this.set(process.uptime()); }
});

const methods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const { assignRequestId, log } = require('./logger');

function observe(req, res, routeLabel, trackMetrics = true) {
  const requestId = assignRequestId(req, res);
  const start = process.hrtime.bigint();
  res.once('finish', () => {
    const method = methods.has(req.method) ? req.method : 'OTHER';
    const route = routeLabel();
    const status_code = res.statusCode;
    const elapsed = Number(process.hrtime.bigint() - start) / 1e9;
    const statusClass = status_code >= 500 ? '5xx' : status_code >= 400 ? '4xx' : null;
    const metricLabels = { method, route, status_code };
    if (trackMetrics) {
      requests.inc(metricLabels);
      duration.observe(metricLabels, elapsed);
      if (statusClass) errors.inc({ status_class: statusClass });
    }
    log(statusClass === '5xx' ? 'ERROR' : statusClass === '4xx' ? 'WARN' : 'INFO', 'HTTP response completed', {
      requestId, method, route, statusCode: status_code, durationMs: elapsed * 1000
    });
  });
  res.once('close', () => {
    if (!res.writableFinished) {
      log('WARN', 'HTTP response interrupted', {
        requestId, method: methods.has(req.method) ? req.method : 'OTHER', route: routeLabel(),
        ...(res.headersSent ? { statusCode: res.statusCode } : {}),
        durationMs: Number(process.hrtime.bigint() - start) / 1e6
      });
    }
  });
  return requestId;
}

async function serveMetrics(res) {
  try {
    const body = await registry.metrics();
    res.writeHead(200, { 'Content-Type': registry.contentType, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Metrics collection failed');
  }
}

module.exports = { observe, serveMetrics };
