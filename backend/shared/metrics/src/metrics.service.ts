// Metrics service — Prometheus RED registry (rate, errors, duration)

import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

// --- Types ---

/**
 * Observation labels for one completed HTTP request.
 * Route holds the Express route pattern (never raw ids) to bound cardinality.
 */
export interface RequestObservation {
  method: string;
  route: string;
  statusCode: number;
  durationSeconds: number;
}

// --- Service ---

/**
 * Per-service Prometheus registry with RED signals.
 * Each service process owns its instance; Prometheus joins them by scrape job.
 */
@Injectable()
export class MetricsService {
  private readonly register = new Registry();
  private readonly requestsTotal: Counter<string>;
  private readonly requestDuration: Histogram<string>;

  constructor() {
    collectDefaultMetrics({ register: this.register, prefix: 'nodejs_' });

    this.requestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of completed HTTP requests.',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.requestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds.',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });
  }

  /**
   * Records one completed request in the counter and the histogram.
   *
   * @param observation - Method, route pattern, status and duration
   */
  observeRequest(observation: RequestObservation): void {
    const labels = {
      method: observation.method,
      route: observation.route,
      status_code: String(observation.statusCode),
    };
    this.requestsTotal.inc(labels);
    this.requestDuration.observe(labels, observation.durationSeconds);
  }

  /**
   * Renders the registry in Prometheus exposition format.
   *
   * @returns Exposition text for the /metrics endpoint
   */
  getMetrics(): Promise<string> {
    return this.register.metrics();
  }

}

/** Content-Type for the Prometheus text exposition format (version 0.0.4). */
export const METRICS_CONTENT_TYPE =
  'text/plain; version=0.0.4; charset=utf-8';
