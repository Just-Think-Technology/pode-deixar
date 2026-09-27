// Metrics barrel — public metrics package exports

export { MetricsModule } from './src/metrics.module';
export { METRICS_CONTENT_TYPE, MetricsService } from './src/metrics.service';
export type { RequestObservation } from './src/metrics.service';
export { MetricsGuard } from './src/metrics.guard';
export { MetricsController } from './src/metrics.controller';
export { HttpMetricsMiddleware } from './src/http-metrics.middleware';
