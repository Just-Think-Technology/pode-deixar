import fs = require('fs');
import os = require('os');
import path = require('path');
import { createLogger } from '../index';

// Production ships logs to Loki through container stdout, so the prod
// stdout stream must be machine-readable JSON (pretty output stays only in
// the local log files and non-prod consoles).

describe('createLogger production stdout', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousLogLevel = process.env.LOG_LEVEL;
  const previousWrite = process.stdout.write.bind(process.stdout);

  let tmpRoot = '';
  let captured = '';

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_LEVEL = 'info';
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-stdout-'));
    captured = '';
    (process.stdout as unknown as { write: unknown }).write = (
      chunk: unknown,
    ): boolean => {
      captured += String(chunk);
      return true;
    };
  });

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.LOG_LEVEL = previousLogLevel;
    process.stdout.write = previousWrite as typeof process.stdout.write;
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('emits JSON lines with service, level and event on stdout', async () => {
    const logger = createLogger(`stdout-json-${Date.now()}`, undefined, {
      logsParentDir: tmpRoot,
    });

    logger.info('some.event', 'hello stdout');

    const line = await waitForJsonLine(() => captured);
    expect(line.service).toBeDefined();
    expect(line.level).toBe('info');
    expect(line.event).toBe('some.event');
  });
});

async function waitForJsonLine(
  read: () => string,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + 5000;
  for (;;) {
    for (const candidate of read().split('\n')) {
      if (!candidate.trim()) continue;
      try {
        return JSON.parse(candidate) as Record<string, unknown>;
      } catch {
        continue;
      }
    }
    if (Date.now() > deadline) throw new Error('no JSON line on stdout');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
