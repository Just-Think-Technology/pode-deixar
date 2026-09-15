import fs = require('fs');
import os = require('os');
import path = require('path');
import createLoggerDefault, { createLogger } from '../index';

process.env.LOG_LEVEL = 'fatal';

const flushImmediate = () =>
  new Promise<void>((resolve) => {
    setImmediate(() => setImmediate(() => resolve()));
  });

describe('createLogger (shared)', () => {
  it('should expose the default export as createLogger', () => {
    expect(createLoggerDefault).toBe(createLogger);
  });

  it('should return the same instance for the same key (cache)', () => {
    const a = createLogger('regression-cache-svc');
    const b = createLogger('regression-cache-svc');

    expect(a).toBe(b);
  });

  it('should return distinct instances for distinct features', () => {
    const a = createLogger('regression-feat-svc', 'feature-a');
    const b = createLogger('regression-feat-svc', 'feature-b');

    expect(a).not.toBe(b);
  });

  it('should accept (event, msg) at all levels without throwing', () => {
    const logger = createLogger('regression-levels-svc');

    expect(() =>
      (['fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const).forEach(
        (level) => logger[level]('regression.event', 'mensagem de teste'),
      ),
    ).not.toThrow();
  });

  it('should remove old logs and preserve recent ones (cleanupOldLogs)', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-regression-'));
    const serviceName = `regression-cleanup-${Date.now()}`;
    const serviceDir = path.join(tmpRoot, serviceName);
    fs.mkdirSync(serviceDir, { recursive: true });

    const oldFile = path.join(serviceDir, 'old.log');
    const freshFile = path.join(serviceDir, 'fresh.log');
    fs.writeFileSync(oldFile, 'old');
    fs.writeFileSync(freshFile, 'fresh');
    const twentyDaysAgo = new Date(Date.now() - 20 * 86400000);
    fs.utimesSync(oldFile, twentyDaysAgo, twentyDaysAgo);

    createLogger(serviceName, undefined, {
      logsParentDir: tmpRoot,
      retainDays: 14,
    });
    await flushImmediate();

    expect(fs.existsSync(oldFile)).toBe(false);
    expect(fs.existsSync(freshFile)).toBe(true);

    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });
});
