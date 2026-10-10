// Metrics guard spec — bearer token on /metrics, fail-closed without secret

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { MetricsGuard } from '../src/metrics.guard';

const TOKEN = 'test-metrics-token-123';

// --- Helpers ---

function contextWith(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authHeader } }),
    }),
  } as unknown as ExecutionContext;
}

describe('MetricsGuard', () => {
  const previousToken = process.env.METRICS_TOKEN;

  beforeEach(() => {
    process.env.METRICS_TOKEN = TOKEN;
  });

  afterAll(() => {
    process.env.METRICS_TOKEN = previousToken;
  });

  it('allows requests with the valid bearer token', () => {
    expect(new MetricsGuard().canActivate(contextWith(`Bearer ${TOKEN}`))).toBe(
      true,
    );
  });

  it('rejects requests without an authorization header', () => {
    expect(() => new MetricsGuard().canActivate(contextWith())).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects requests with a wrong token', () => {
    expect(() =>
      new MetricsGuard().canActivate(contextWith('Bearer wrong-token')),
    ).toThrow(UnauthorizedException);
  });

  it('rejects every request when METRICS_TOKEN is not configured', () => {
    delete process.env.METRICS_TOKEN;
    expect(() =>
      new MetricsGuard().canActivate(contextWith(`Bearer ${TOKEN}`)),
    ).toThrow(UnauthorizedException);
  });
});
