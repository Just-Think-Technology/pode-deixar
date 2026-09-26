// HTTP metrics middleware spec — RED observation without cardinality leaks

import { EventEmitter } from 'events';
import { MetricsService } from '../src/metrics.service';
import { HttpMetricsMiddleware } from '../src/http-metrics.middleware';

class FakeResponse extends EventEmitter {
  statusCode = 200;
}

// --- Helpers ---

function fakeRequest(path: string, routePath?: string, method = 'GET') {
  return { method, path, route: routePath ? { path: routePath } : undefined };
}

function run(middleware: HttpMetricsMiddleware, req: unknown) {
  const res = new FakeResponse();
  middleware.use(req as never, res as never, () => undefined);
  return res;
}

describe('HttpMetricsMiddleware', () => {
  let metrics: MetricsService;
  let middleware: HttpMetricsMiddleware;

  beforeEach(() => {
    metrics = new MetricsService();
    middleware = new HttpMetricsMiddleware(metrics);
  });

  it('observes completed requests with method, route pattern and status', async () => {
    const exposition = await observeAndRender(
      middleware,
      metrics,
      fakeRequest('/api/v1/service-orders/abc123', '/api/v1/service-orders/:id'),
    );

    expect(exposition).toContain('http_requests_total');
    expect(exposition).toContain('method="GET"');
    expect(exposition).toContain('route="/api/v1/service-orders/:id"');
    expect(exposition).toContain('status_code="200"');
  });

  it('labels unmatched requests instead of echoing raw paths', async () => {
    const exposition = await observeAndRender(
      middleware,
      metrics,
      fakeRequest('/api/v1/users/some-raw-id-12345'),
    );

    expect(exposition).toContain('route="unmatched"');
    expect(exposition).not.toContain('some-raw-id-12345');
  });

  it('skips /metrics scrapes and /health probes', async () => {
    await observeAndRender(
      middleware,
      metrics,
      fakeRequest('/metrics', '/metrics'),
    );
    await observeAndRender(
      middleware,
      metrics,
      fakeRequest('/health', '/health'),
    );

    const exposition = await metrics.getMetrics();
    expect(exposition).not.toContain('http_requests_total');
  });
});

async function observeAndRender(
  middleware: HttpMetricsMiddleware,
  metrics: MetricsService,
  req: ReturnType<typeof fakeRequest>,
): Promise<string> {
  const res = run(middleware, req);
  res.emit('finish');
  await new Promise((resolve) => setImmediate(resolve));
  return metrics.getMetrics();
}
