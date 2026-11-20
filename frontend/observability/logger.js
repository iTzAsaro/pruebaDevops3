const crypto = require('node:crypto');

class TelemetryEmitter {
  constructor(serviceIdentifier) {
    this.tag = serviceIdentifier;
    this.uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  }

  emit(level, message, context = {}) {
    const record = {
      timestamp: new Date().toISOString(),
      level,
      service: this.tag,
      message,
      ...context
    };
    process.stdout.write(`${JSON.stringify(record)}\n`);
  }

  bindRequestId(req, res) {
    const rawId = req.headers['x-request-id'];
    const valid = typeof rawId === 'string' && rawId.length === 36 && this.uuidPattern.test(rawId);
    const resolvedId = valid ? rawId : crypto.randomUUID();
    res.setHeader('X-Request-Id', resolvedId);
    return resolvedId;
  }

  installSafetyHarness() {
    process.once('uncaughtException', (_err, reason) => {
      try {
        const payload = JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          service: this.tag,
          message: 'Fatal runtime error',
          origin: reason
        });
        process.stderr.write(`${payload}\n`);
      } finally {
        process.exit(1);
      }
    });
  }
}

const frontendEmitter = new TelemetryEmitter('frontend');

module.exports = {
  assignRequestId: (req, res) => frontendEmitter.bindRequestId(req, res),
  log: (level, msg, extra) => frontendEmitter.emit(level, msg, extra),
  monitorFatalErrors: () => frontendEmitter.installSafetyHarness()
};
