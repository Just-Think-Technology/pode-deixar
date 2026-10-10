// Prisma tracing — one span per database operation

import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import {
  ATTR_DB_COLLECTION_NAME,
  ATTR_DB_OPERATION_NAME,
  ATTR_DB_SYSTEM_NAME,
  DB_SYSTEM_NAME_VALUE_POSTGRESQL,
} from '@opentelemetry/semantic-conventions';

// --- Constants ---

/** Instrumentation scope reported for every database span. */
const TRACER_NAME = '@pode-deixar/tracing';

// --- Types ---

/** Operation Prisma hands to the extension; the query resolver runs it. */
export interface PrismaOperationRequest {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => unknown;
}

export interface PrismaQueryExtension {
  query: {
    $allOperations: (request: PrismaOperationRequest) => unknown;
  };
}

// --- Extension ---

/**
 * Prisma client extension that opens one CLIENT span per database operation.
 *
 * Needed because Prisma's query engine is a Rust binary that never goes
 * through the instrumented `pg` driver, so auto-instrumentation cannot see
 * database work. Nested reads are executed by the engine inside the parent
 * operation, which keeps one repository call to one span.
 *
 * The span carries only the model and the operation: arguments and statements
 * are left out on purpose, since they can hold personal data and secrets.
 *
 * @returns Extension to hand to `prisma.$extends`
 */
export function buildPrismaTracingExtension(): PrismaQueryExtension {
  const tracer = trace.getTracer(TRACER_NAME);

  return {
    query: {
      $allOperations({ model, operation, args, query }: PrismaOperationRequest) {
        return tracer.startActiveSpan(buildSpanName(operation, model), { kind: SpanKind.CLIENT }, async (span) => {
          span.setAttribute(ATTR_DB_SYSTEM_NAME, DB_SYSTEM_NAME_VALUE_POSTGRESQL);
          span.setAttribute(ATTR_DB_OPERATION_NAME, buildOperationName(operation));

          if (model !== undefined) {
            span.setAttribute(ATTR_DB_COLLECTION_NAME, model);
          }

          try {
            return await query(args);
          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
            throw error;
          } finally {
            span.end();
          }
        });
      },
    },
  };
}

// --- Helpers ---

/** Span name follows the database semantic conventions: `findMany ServiceOrder`. */
function buildSpanName(operation: string, model?: string): string {
  const name = buildOperationName(operation);

  return model === undefined ? name : `${name} ${model}`;
}

/** Raw statements arrive as `$queryRaw`; the span drops the `$` prefix. */
function buildOperationName(operation: string): string {
  return operation.startsWith('$') ? operation.slice(1) : operation;
}
