// Metrics controller spec — Prometheus exposition behind the bearer guard

import { MetricsService } from '../src/metrics.service';
import { MetricsController } from '../src/metrics.controller';

describe('MetricsController', () => {
  it('renders the registry in Prometheus exposition format', async () => {
    const metrics = new MetricsService();
    metrics.observeRequest({
      method: 'GET',
      route: '/api/v1/health',
      statusCode: 200,
      durationSeconds: 0.01,
    });

    const body = await new MetricsController(metrics).getMetrics();

    expect(body).toContain('# HELP http_requests_total');
    expect(body).toContain('# TYPE http_request_duration_seconds histogram');
  });
});
