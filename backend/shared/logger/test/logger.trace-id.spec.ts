import fs = require('fs');
import os = require('os');
import path = require('path');
import { context, trace } from '@opentelemetry/api';
import { createLogger } from '../index';

// Every JSON log line inside an active span must carry traceId/spanId so
// logs join traces in Tempo/Grafana without a second lookup.

const TRACE_ID = 'a'.repeat(32);
const SPAN_ID = 'b'.repeat(16);

describe('createLogger trace correlation', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousLogLevel = process.env.LOG_LEVEL;
  const previousWrite = process.stdout.write.bind(process.stdout);

  let tmpRoot = '';
  let captured = '';

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_LEVEL = 'info';
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-trace-'));
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

  it('attaches traceId and spanId inside an active span', async () => {
    const span = trace.wrapSpanContext({
      traceId: TRACE_ID,
      spanId: SPAN_ID,
      traceFlags: 1,
    });

    await context.with(trace.setSpan(context.active(), span), async () => {
      createLogger(`trace-on-${Date.now()}`, undefined, {
        logsParentDir: tmpRoot,
      }).info('some.event', 'inside span');
    });

    const line = await waitForJsonLine(() => captured);
    expect(line.traceId).toBe(TRACE_ID);
    expect(line.spanId).toBe(SPAN_ID);
  });

  it('omits trace fields outside any span', async () => {
    createLogger(`trace-off-${Date.now()}`, undefined, {
      logsParentDir: tmpRoot,
    }).info('some.event', 'outside span');

    const line = await waitForJsonLine(() => captured);
    expect(line.traceId).toBeUndefined();
    expect(line.spanId).toBeUndefined();
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
