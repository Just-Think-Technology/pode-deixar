// Metrics module — RED observability wiring for NestJS services

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsGuard } from './metrics.guard';
import { MetricsService } from './metrics.service';
import { HttpMetricsMiddleware } from './http-metrics.middleware';

// --- Module ---

/**
 * Registers the /metrics endpoint, its bearer guard and the RED observation
 * middleware. Import once per service root module.
 */
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsGuard, HttpMetricsMiddleware],
  exports: [MetricsService],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}
