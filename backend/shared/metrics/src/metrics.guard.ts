// Metrics guard — bearer token for the /metrics endpoint, fail-closed

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

// --- Guard ---

/**
 * Allows /metrics scrapes only with the shared METRICS_TOKEN bearer.
 * Denies everything when the secret is not configured (fail-closed), so a
 * missing env never silently exposes the endpoint — even on the internal
 * network.
 */
@Injectable()
export class MetricsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const header = request.headers.authorization;
    const presented = Array.isArray(header) ? header[0] : (header ?? '');
    const expected = process.env.METRICS_TOKEN ?? '';

    if (!this.matches(presented, expected)) {
      throw new UnauthorizedException('Token de métricas ausente ou inválido');
    }
    return true;
  }

  // --- Private Helpers ---

  private matches(presented: string, expected: string): boolean {
    if (!expected || !presented.startsWith('Bearer ')) {
      return false;
    }
    const candidate = Buffer.from(presented.slice('Bearer '.length));
    const secret = Buffer.from(expected);
    return (
      candidate.length === secret.length && timingSafeEqual(candidate, secret)
    );
  }
}
