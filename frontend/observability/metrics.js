const { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } = require('prom-client');
const { assignRequestId, log } = require('./logger');

const frontendRegistry = new Registry();
frontendRegistry.setDefaultLabels({ service: 'frontend' });
collectDefaultMetrics({ register: frontendRegistry });

const HTTP_LABELS = ['method', 'route', 'status_code'];
const HTTP_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const VALID_HTTP_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

const httpRequestsCounter = new Counter({
  name: 'vicity_http_requests_total',
  help: 'Total HTTP requests served by frontend gateway',
  labelNames: HTTP_LABELS,
  registers: [frontendRegistry]
});

const httpDurationHistogram = new Histogram({
  name: 'vicity_http_request_duration_seconds',
  help: 'Latency distribution of frontend HTTP responses in seconds',
  labelNames: HTTP_LABELS,
  registers: [frontendRegistry],
  buckets: HTTP_BUCKETS
});

const httpErrorsCounter = new Counter({
  name: 'vicity_http_errors_total',
  help: 'Total HTTP error responses by classification category',
  labelNames: ['status_class'],
  registers: [frontendRegistry]
});

['4xx', '5xx'].forEach((cls) => httpErrorsCounter.inc({ status_class: cls }, 0));

const processUptimeGauge = new Gauge({
  name: 'vicity_process_uptime_seconds',
  help: 'Frontend Node.js runtime process uptime in seconds',
  registers: [frontendRegistry],
  collect() {
    this.set(process.uptime());
  }
});

function recordCompletedResponse(options) {
  const { req, res, routeLabel, startNano, trackMetrics, reqId } = options;
  const currentMethod = VALID_HTTP_METHODS.has(req.method) ? req.method : 'OTHER';
  const targetRoute = routeLabel();
  const statusCode = res.statusCode;
  const elapsedSec = Number(process.hrtime.bigint() - startNano) / 1e9;
  const errClass = statusCode >= 500 ? '5xx' : (statusCode >= 400 ? '4xx' : null);

  if (trackMetrics) {
    const labels = { method: currentMethod, route: targetRoute, status_code: statusCode };
    httpRequestsCounter.inc(labels);
    httpDurationHistogram.observe(labels, elapsedSec);
    if (errClass) {
      httpErrorsCounter.inc({ status_class: errClass });
    }
  }

  const logSeverity = errClass === '5xx' ? 'ERROR' : (errClass === '4xx' ? 'WARN' : 'INFO');
  log(logSeverity, 'HTTP response completed', {
    requestId: reqId,
    method: currentMethod,
    route: targetRoute,
    statusCode,
    durationMs: elapsedSec * 1000
  });
}

function recordInterruptedResponse(req, res, routeLabel, startNano, reqId) {
  if (res.writableFinished) return;
  const currentMethod = VALID_HTTP_METHODS.has(req.method) ? req.method : 'OTHER';
  const durationMs = Number(process.hrtime.bigint() - startNano) / 1e6;
  const extra = res.headersSent ? { statusCode: res.statusCode } : {};
  log('WARN', 'HTTP response interrupted', {
    requestId: reqId,
    method: currentMethod,
    route: routeLabel(),
    ...extra,
    durationMs
  });
}

function observe(req, res, routeLabel, trackMetrics = true) {
  const reqId = assignRequestId(req, res);
  const startNano = process.hrtime.bigint();

  res.once('finish', () => {
    recordCompletedResponse({ req, res, routeLabel, startNano, trackMetrics, reqId });
  });

  res.once('close', () => {
    recordInterruptedResponse(req, res, routeLabel, startNano, reqId);
  });

  return reqId;
}

async function serveMetrics(res) {
  try {
    const metricsPayload = await frontendRegistry.metrics();
    res.writeHead(200, {
      'Content-Type': frontendRegistry.contentType,
      'Cache-Control': 'no-store'
    });
    res.end(metricsPayload);
  } catch (_err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Metrics collection failed');
  }
}

module.exports = { observe, serveMetrics };
