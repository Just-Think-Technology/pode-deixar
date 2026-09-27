// Tracing barrel — public tracing package exports

export {
  DEFAULT_OTLP_ENDPOINT,
  DEFAULT_SAMPLE_RATIO,
  buildInstrumentations,
  buildResource,
  initTracing,
  resolveOtlpEndpoint,
  resolveSampleRatio,
} from './src/tracing';
