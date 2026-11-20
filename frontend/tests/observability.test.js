const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const { test } = require('node:test');

async function listen (t, server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

async function request (baseUrl, path, method, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { connection: 'close', 'x-request-id': 'ae31a3a9-525e-480b-a7b8-b8a8d082e8ff' },
    signal: AbortSignal.timeout(5000)
  });
  const body = await response.text();
  assert.equal(response.status, expectedStatus, `${method} ${path}`);
  assert.equal(response.headers.get('x-request-id'), 'ae31a3a9-525e-480b-a7b8-b8a8d082e8ff');
  return { body, contentType: response.headers.get('content-type') || '' };
}

function sample (body, name, expectedLabels) {
  const samples = body.split(/\r?\n/).flatMap((line) => {
    const match = /^([^\s{]+)\{([^}]*)\}\s+(\S+)/.exec(line);
    if (!match || match[1] !== name) return [];
    const labels = Object.fromEntries(Array.from(
      match[2].matchAll(/(\w+)="([^"]*)"/g), ([, key, value]) => [key, value]
    ));
    return Object.entries(expectedLabels).every(([key, value]) => labels[key] === value)
      ? [Number(match[3])]
      : [];
  });
  assert.equal(samples.length, 1, `${name} con ${JSON.stringify(expectedLabels)}`);
  assert.ok(Number.isFinite(samples[0]), `${name} debe tener un valor numérico finito`);
  return samples[0];
}

function httpSamples (body) {
  return body.split(/\r?\n/).filter((line) => line.startsWith('vicity_http_')).sort();
}

test('el frontend exporta salud y métricas HTTP con rutas normalizadas', async (t) => {
  const upstreamRequests = [];
  const upstream = http.createServer((req, res) => {
    upstreamRequests.push([req.method, req.url, req.headers['x-request-id']]);
    res.setHeader('X-Request-Id', 'ignored-upstream-id');
    res.writeHead(502);
    res.end('Respuesta de prueba del upstream');
  });
  const upstreamUrl = await listen(t, upstream);
  const previousBackendUrl = process.env.BACKEND_URL;
  let frontend;
  try {
    process.env.BACKEND_URL = upstreamUrl;
    frontend = require('../server');
  } finally {
    if (previousBackendUrl === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = previousBackendUrl;
  }
  const frontendUrl = await listen(t, frontend);

  await request(frontendUrl, '/', 'GET', 200);
  await request(frontendUrl, '/style.css', 'HEAD', 200);
  await request(frontendUrl, '/observability-test-missing.css', 'GET', 404);
  await request(frontendUrl, '/api/observability-test', 'GET', 502);
  assert.deepEqual(upstreamRequests, [['GET', '/api/observability-test', 'ae31a3a9-525e-480b-a7b8-b8a8d082e8ff']]);

  const metrics = await request(frontendUrl, '/metrics', 'GET', 200);
  assert.match(metrics.contentType, /^text\/plain\b/i);
  assert.match(metrics.body, /^# TYPE vicity_http_requests_total counter\s*$/m);
  assert.match(metrics.body, /^# TYPE vicity_http_request_duration_seconds (histogram|summary)\s*$/m);
  assert.match(metrics.body, /^# TYPE vicity_http_errors_total counter\s*$/m);

  for (const [method, route, status_code] of [
    ['GET', '/', '200'],
    ['HEAD', 'static', '200'],
    ['GET', 'static', '404'],
    ['GET', 'api_proxy', '502']
  ]) {
    const labels = { service: 'frontend', method, route, status_code };
    assert.equal(sample(metrics.body, 'vicity_http_requests_total', labels), 1);
    assert.equal(sample(metrics.body, 'vicity_http_request_duration_seconds_count', labels), 1);
    assert.ok(sample(metrics.body, 'vicity_http_request_duration_seconds_sum', labels) >= 0);
  }
  for (const status_class of ['4xx', '5xx']) {
    assert.equal(sample(metrics.body, 'vicity_http_errors_total', { service: 'frontend', status_class }), 1);
  }

  const health = await request(frontendUrl, '/healthz', 'GET', 200);
  assert.match(health.contentType, /^application\/json\b/i);
  const { status, uptimeSeconds, timestamp, dependencies } = JSON.parse(health.body);
  assert.equal(status, 'ok');
  assert.ok(Number.isFinite(uptimeSeconds) && uptimeSeconds >= 0);
  assert.equal(typeof timestamp, 'string');
  assert.ok(Number.isFinite(Date.parse(timestamp)));
  assert.ok(['not_checked', 'not_configured'].includes(dependencies?.backend));

  const nextMetrics = await request(frontendUrl, '/metrics', 'GET', 200);
  assert.deepEqual(httpSamples(nextMetrics.body), httpSamples(metrics.body),
    '/healthz y /metrics no deben alterar las métricas HTTP');
  assert.deepEqual(upstreamRequests, [['GET', '/api/observability-test', 'ae31a3a9-525e-480b-a7b8-b8a8d082e8ff']],
    '/healthz y /metrics no deben consultar al upstream');
});
