// Common module — shared filter and interceptor wiring

import { Module } from "@nestjs/common";
import { GlobalExceptionFilter } from "./global-exception.filter";
import { createResponseLoggerInterceptor } from "@pode-deixar/logger";

const ResponseLoggerInterceptor =
  createResponseLoggerInterceptor("payments-service");

@Module({
  // --- Providers ---

  providers: [GlobalExceptionFilter, ResponseLoggerInterceptor],
  exports: [GlobalExceptionFilter, ResponseLoggerInterceptor],
})
export class CommonModule {}
