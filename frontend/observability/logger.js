const { randomUUID } = require('node:crypto');
const { writeSync } = require('node:fs');

const service = 'frontend';
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assignRequestId(req, res) {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && incoming.length === 36 && requestIdPattern.test(incoming)
    ? incoming : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  return requestId;
}

function log(level, message, fields = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, service, message, ...fields }));
}

function monitorFatalErrors() {
  // Do not resume after a fatal exception or print the raw error/stack.
  process.once('uncaughtException', (_error, origin) => {
    try {
      writeSync(2, JSON.stringify({
        timestamp: new Date().toISOString(), level: 'ERROR', service,
        message: 'Fatal runtime error', origin
      }) + '\n');
    } finally {
      process.exit(1);
    }
  });
}

module.exports = { assignRequestId, log, monitorFatalErrors };
