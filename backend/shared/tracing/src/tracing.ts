// Tracing setup — OpenTelemetry SDK bootstrap for NestJS services

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// --- Defaults ---

/** OTLP/HTTP endpoint of the internal Tempo (compose DNS name). */
export const DEFAULT_OTLP_ENDPOINT = 'http://tempo:4318';

/** Fraction of root spans kept when OTEL_TRACES_SAMPLER_ARG is unset. */
export const DEFAULT_SAMPLE_RATIO = 0.1;

/** Disables tracing entirely (local runs without any collector). */
const DISABLED_FLAG = 'false';

// --- Config Builders ---

/**
 * OTLP endpoint for trace export, explicit env first.
 *
 * @returns Collector URL without the trailing /v1/traces path
 */
export function resolveOtlpEndpoint(): string {
  return process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? DEFAULT_OTLP_ENDPOINT;
}

/**
 * Root-span sample ratio, explicit env first, fail-safe default.
 *
 * @returns Number between 0 and 1 (defaults to 0.1 on garbage input)
 */
export function resolveSampleRatio(): number {
  const raw = process.env.OTEL_TRACES_SAMPLER_ARG;
  const parsed = raw === undefined ? NaN : Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : DEFAULT_SAMPLE_RATIO;
}

/**
 * Resource identifying this service in every exported span.
 *
 * @param serviceName - Stable service name (e.g. auth-service)
 * @returns Resource with the service.name attribute
 */
export function buildResource(serviceName: string) {
  return resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName });
}

// --- SDK Bootstrap ---

let started = false;

/**
 * Auto-instrumentation set used by every service.
 *
 * The pino instrumentation stays out on purpose: the mixin in
 * @pode-deixar/logger already writes traceId/spanId from the span active on
 * each line, while the instrumentation would duplicate those fields and bind
 * the context of the first log call to the logger instance, tagging later
 * unrelated lines with a stale traceId.
 *
 * @returns Node auto-instrumentations, without the pino one
 */
export function buildInstrumentations(): ReturnType<typeof getNodeAutoInstrumentations> {
  return getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-pino': { enabled: false },
  });
}

/**
 * Starts the OpenTelemetry SDK with HTTP/Express auto-instrumentation and
 * OTLP/HTTP export to the internal Tempo. Idempotent; skipped when
 * OTEL_ENABLED=false. Call once, as the first import of each service entry
 * point, before any framework module loads.
 *
 * @param serviceName - Stable service name (e.g. auth-service)
 */
export function initTracing(serviceName: string): void {
  if (started || process.env.OTEL_ENABLED === DISABLED_FLAG) {
    return;
  }
  started = true;

  const sdk = new NodeSDK({
    resource: buildResource(serviceName),
    traceExporter: new OTLPTraceExporter({
      url: `${resolveOtlpEndpoint()}/v1/traces`,
    }),
    instrumentations: [buildInstrumentations()],
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(resolveSampleRatio()),
    }),
  });
  sdk.start();
}
