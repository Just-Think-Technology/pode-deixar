// Tracing config spec — pure builders (SDK startup is verified by boot, not units)

import {
  DEFAULT_OTLP_ENDPOINT,
  DEFAULT_SAMPLE_RATIO,
  buildInstrumentations,
  buildResource,
  resolveOtlpEndpoint,
  resolveSampleRatio,
} from '../src/tracing';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// --- Suite ---

describe('tracing config', () => {
  const previousEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const previousRatio = process.env.OTEL_TRACES_SAMPLER_ARG;

  afterEach(() => {
    if (previousEndpoint === undefined) delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    else process.env.OTEL_EXPORTER_OTLP_ENDPOINT = previousEndpoint;
    if (previousRatio === undefined) delete process.env.OTEL_TRACES_SAMPLER_ARG;
    else process.env.OTEL_TRACES_SAMPLER_ARG = previousRatio;
  });

  it('tags the resource with the service name', () => {
    const resource = buildResource('auth-service');

    expect(resource.attributes[ATTR_SERVICE_NAME]).toBe('auth-service');
  });

  it('defaults the OTLP endpoint to the internal Tempo', () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    expect(resolveOtlpEndpoint()).toBe(DEFAULT_OTLP_ENDPOINT);
  });

  it('honors an explicit OTLP endpoint', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://tempo-staging:4318';

    expect(resolveOtlpEndpoint()).toBe('http://tempo-staging:4318');
  });

  it('samples 10% by default', () => {
    delete process.env.OTEL_TRACES_SAMPLER_ARG;

    expect(resolveSampleRatio()).toBe(DEFAULT_SAMPLE_RATIO);
  });

  it('honors an explicit sample ratio and rejects garbage', () => {
    process.env.OTEL_TRACES_SAMPLER_ARG = '0.5';
    expect(resolveSampleRatio()).toBe(0.5);

    process.env.OTEL_TRACES_SAMPLER_ARG = 'not-a-number';
    expect(resolveSampleRatio()).toBe(DEFAULT_SAMPLE_RATIO);
  });

  // Regression guard: re-enabling the pino instrumentation would duplicate
  // traceId/spanId on every log line and pin the first log call's context to
  // the logger, tagging unrelated later lines with a stale traceId. The pino
  // mixin in @pode-deixar/logger is the only source of those fields.
  it('excludes the pino instrumentation but keeps the HTTP and Nest ones', () => {
    // The config object carries no instrumentation name, so the class name is
    // the identifier; the presence assertions keep the check from passing on
    // an empty list.
    const classNames = buildInstrumentations().map(
      (instrumentation) => instrumentation.constructor.name,
    );

    expect(classNames).not.toContain('PinoInstrumentation');
    expect(classNames).toContain('HttpInstrumentation');
    expect(classNames).toContain('NestInstrumentation');
  });
});
