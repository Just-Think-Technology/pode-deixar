// Metrics controller — Prometheus exposition endpoint

import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { METRICS_CONTENT_TYPE, MetricsService } from './metrics.service';
import { MetricsGuard } from './metrics.guard';

// --- Controller ---

/**
 * Serves the RED registry for Prometheus scrapes over the internal compose
 * network. No Caddy route points here, and the bearer guard is the second
 * layer against misrouted or in-network access.
 */
@ApiExcludeController()
@Controller('metrics')
@UseGuards(MetricsGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * Renders the registry in Prometheus exposition format.
   *
   * @returns Exposition text with the service RED signals
   */
  @Get()
  @Header('Content-Type', METRICS_CONTENT_TYPE)
  getMetrics(): Promise<string> {
    return this.metrics.getMetrics();
  }
}
