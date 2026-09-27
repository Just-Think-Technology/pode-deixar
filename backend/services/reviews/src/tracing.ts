// Tracing bootstrap — OpenTelemetry SDK startup, must stay the first import in main.ts

import { initTracing } from "@pode-deixar/tracing";

initTracing("reviews-service");
