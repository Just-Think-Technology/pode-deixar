// Prisma tracing spec — one span per database operation, nested under the request

import { SpanKind, SpanStatusCode, context, trace } from '@opentelemetry/api';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { buildPrismaTracingExtension } from '../src/prisma-tracing';

// --- Suite ---

describe('prisma tracing extension', () => {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

  beforeAll(() => {
    provider.register();
  });

  afterAll(async () => {
    await provider.shutdown();
  });

  beforeEach(() => {
    exporter.reset();
  });

  // --- Model operations ---

  it('wraps a model operation in a span named after the operation and model', async () => {
    const { runOperation } = buildExtensionHarness();
    const result = await runOperation({ model: 'ServiceOrder', operation: 'findMany' }, () => ['pedido']);

    expect(result).toEqual(['pedido']);
    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe('findMany ServiceOrder');
    expect(span.kind).toBe(SpanKind.CLIENT);
  });

  it('tags the span with the database system, operation and model', async () => {
    const { runOperation } = buildExtensionHarness();

    await runOperation({ model: 'ServiceOrder', operation: 'create' });

    const [span] = exporter.getFinishedSpans();
    expect(span.attributes).toMatchObject({
      'db.system.name': 'postgresql',
      'db.operation.name': 'create',
      'db.collection.name': 'ServiceOrder',
    });
  });

  // Nested reads are executed by the engine inside the parent operation, so
  // they must not produce a second span: one repository call = one span.
  it('does not record the query arguments, which may carry personal data', async () => {
    const { runOperation } = buildExtensionHarness();

    await runOperation(
      { model: 'User', operation: 'findUnique', args: { where: { email: 'cliente@exemplo.com' } } },
    );

    const [span] = exporter.getFinishedSpans();
    const attributeValues = Object.values(span.attributes).map(String);
    expect(attributeValues).not.toContain('cliente@exemplo.com');
    expect(span.attributes['db.query.text']).toBeUndefined();
    expect(span.attributes['db.statement']).toBeUndefined();
  });

  // --- Raw statements ---

  it('names the span after a raw statement, which has no model behind it', async () => {
    const { runOperation } = buildExtensionHarness();

    await runOperation({ operation: '$queryRaw' });

    const [span] = exporter.getFinishedSpans();
    expect(span.name).toBe('queryRaw');
    expect(span.attributes['db.collection.name']).toBeUndefined();
  });

  // --- Context ---

  it('nests the span under the request span that triggered the query', async () => {
    const { runOperation } = buildExtensionHarness();
    const tracer = trace.getTracer('test');
    const requestSpan = tracer.startSpan('GET /api/v1/services/:orderId');

    await context.with(trace.setSpan(context.active(), requestSpan), () =>
      runOperation({ model: 'ServiceOrder', operation: 'findUnique' }),
    );
    requestSpan.end();

    const spans = exporter.getFinishedSpans();
    const databaseSpan = spans.find((span) => span.name === 'findUnique ServiceOrder');
    expect(databaseSpan?.parentSpanContext?.spanId).toBe(requestSpan.spanContext().spanId);
  });

  // --- Failures ---

  it('records the failure and rethrows so the repository still sees the error', async () => {
    const { runOperation } = buildExtensionHarness();
    const failure = new Error('conexão recusada');

    await expect(
      runOperation({ model: 'ServiceOrder', operation: 'findMany' }, () => {
        throw failure;
      }),
    ).rejects.toBe(failure);

    const [span] = exporter.getFinishedSpans();
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(span.events.map((event) => event.name)).toContain('exception');
  });
});

// --- Harness ---

interface OperationRequest {
  model?: string;
  operation: string;
  args?: unknown;
}

interface Harness {
  runOperation: (
    request: OperationRequest,
    query?: (args: unknown) => unknown,
  ) => Promise<unknown>;
}

/**
 * Drives the extension's `$allOperations` callback the way Prisma does: the
 * callback receives the operation plus a `query` resolver and must return its
 * result.
 */
function buildExtensionHarness(): Harness {
  const runOperation = async (
    request: OperationRequest,
    query: (args: unknown) => unknown = () => undefined,
  ): Promise<unknown> => {
    const extension = buildPrismaTracingExtension();
    const callback = extension.query.$allOperations as (input: {
      model?: string;
      operation: string;
      args: unknown;
      query: (args: unknown) => unknown;
    }) => unknown;

    return callback({ model: request.model, operation: request.operation, args: request.args ?? {}, query });
  };

  return { runOperation };
}
