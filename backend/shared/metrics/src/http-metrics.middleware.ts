// HTTP metrics middleware — RED observation on response finish

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

// Paths excluded from observation: scrapes and probes would drown the RED signals.
const SKIPPED_PREFIXES = ['/metrics', '/health'];

const UNMATCHED_ROUTE = 'unmatched';

// --- Middleware ---

/**
 * Observes every completed request (including guard rejections) with the
 * Express route pattern — never raw paths, so ids cannot explode cardinality
 * or leak PII into labels.
 */
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (SKIPPED_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
      next();
      return;
    }

    const startedAt = Date.now();
    res.on('finish', () => {
      this.metrics.observeRequest({
        method: req.method,
        route: (req as Request & { route?: { path?: string } }).route?.path
          ?? UNMATCHED_ROUTE,
        statusCode: res.statusCode,
        durationSeconds: (Date.now() - startedAt) / 1000,
      });
    });
    next();
  }
}
