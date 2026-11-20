const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const { spawnSync } = require('node:child_process');

test('fatal runtime errors log sanitized JSON and exit nonzero', () => {
  for (const script of ["throw new Error('synthetic-fatal-secret')", "Promise.reject(new Error('synthetic-fatal-secret'))"]) {
    const child = spawnSync(process.execPath, ['--unhandled-rejections=throw', '-e',
      `require('./src/observability/logger').monitorFatalErrors(); ${script}`],
    { cwd: require('node:path').join(__dirname, '..'), encoding: 'utf8', timeout: 5000 });
    assert.ifError(child.error);
    assert.equal(child.status, 1);
    assert.doesNotMatch(child.stderr, /synthetic-fatal-secret/);
    const record = JSON.parse(child.stderr);
    assert.equal(record.level, 'ERROR');
    assert.equal(record.message, 'Fatal runtime error');
  }
});

// Inject a handler failure in this test process only; production has no test route.
const catalog = require('../src/controllers/catalogController');
const original = catalog.getEditions;
catalog.getEditions = () => { throw new Error('test-only failure'); };
const server = require('../src/server');
catalog.getEditions = original;

test('backend: scrape, counters, histogram, error classes, health and redaction', async (t) => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())));
  const messages = [];
  t.mock.method(console, 'log', message => messages.push(JSON.parse(message)));
  async function get(path, status = 200) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      headers: { connection: 'close', authorization: 'Bearer synthetic-secret', cookie: 'session=synthetic-cookie', 'x-request-id': 'synthetic-invalid-id' }, signal: AbortSignal.timeout(5000)
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('x-request-id'), messages.at(-1).requestId);
    return { text: await response.text(), type: response.headers.get('content-type') };
  }
  const initial = await get('/metrics');
  assert.match(initial.type, /^text\/plain; version=0\.0\.4/);
  assert.match(initial.text, /^# TYPE vicity_http_requests_total counter$/m);
  assert.match(initial.text, /^# TYPE vicity_http_request_duration_seconds histogram$/m);
  assert.doesNotMatch(initial.text, /^vicity_http_requests_total\{/m);
  for (const metric of ['process_cpu_seconds_total', 'process_resident_memory_bytes', 'nodejs_heap_size_used_bytes', 'vicity_process_uptime_seconds']) {
    assert.match(initial.text, new RegExp(`^${metric}\\{[^}]*service="backend"[^}]*\\} [\\d.e+-]+$`, 'm'));
  }

  await get('/api/orders/private-order?email=synthetic-marker', 404);
  await get('/api/orders/another-order', 404);
  await get('/api/editions', 500);
  const health = JSON.parse((await get('/api/health')).text);
  assert.equal(health.status, 'ok');
  assert.ok(Number.isFinite(health.uptimeSeconds) && health.uptimeSeconds >= 0);
  assert.ok(Number.isFinite(Date.parse(health.timestamp)));
  assert.deepEqual(health.dependencies, {});
  assert.equal(typeof health.memoryUsageMB.heapUsed, 'number');

  const { text } = await get('/metrics');
  function sample(name, labels) {
    const lines = text.split('\n').filter(line => line.startsWith(`${name}{`) &&
      Object.entries({ service: 'backend', ...labels }).every(([key, value]) => line.includes(`${key}="${value}"`)));
    assert.equal(lines.length, 1, name);
    const value = Number(lines[0].split(' ').at(-1));
    assert.ok(Number.isFinite(value));
    return value;
  }
  const labels = { method: 'GET', route: '/api/orders/:id', status_code: '404' };
  assert.equal(sample('vicity_http_requests_total', labels), 2);
  assert.equal(sample('vicity_http_request_duration_seconds_count', labels), 2);
  assert.equal(sample('vicity_http_request_duration_seconds_bucket', { ...labels, le: '+Inf' }), 2);
  assert.ok(sample('vicity_http_request_duration_seconds_sum', labels) > 0);
  assert.equal(sample('vicity_http_errors_total', { status_class: '4xx' }), 2);
  assert.equal(sample('vicity_http_errors_total', { status_class: '5xx' }), 1);
  assert.doesNotMatch(text, /private-order|another-order|synthetic-marker|route="\/api\/health"|route="\/metrics"/);
  const appLogs = messages.filter(log => !['/metrics', '/api/health'].includes(log.route));
  assert.equal(appLogs.length, 3);
  assert.deepEqual(appLogs.map(log => [log.level, log.route]), [
    ['WARN', '/api/orders/:id'], ['WARN', '/api/orders/:id'], ['ERROR', '/api/editions']
  ]);
  assert.ok(messages.every(log => log.durationMs > 0 && Number.isFinite(Date.parse(log.timestamp))));
  assert.deepEqual(appLogs.map(log => log.statusCode), [404, 404, 500]);
  assert.ok(messages.every(log => /^[a-f0-9-]{36}$/i.test(log.requestId) && log.message === 'HTTP response completed'));
  assert.doesNotMatch(JSON.stringify(messages), /private-order|another-order|synthetic-marker|test-only failure|synthetic-secret|synthetic-cookie|synthetic-invalid-id/);
  assert.equal(new Set(messages.map(log => log.requestId)).size, messages.length);
});
