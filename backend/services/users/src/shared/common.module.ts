// Common module — shared filter and interceptor wiring

import { Module } from "@nestjs/common";
import { GlobalExceptionFilter } from "./global-exception.filter";
import { ResponseLoggerInterceptor } from "./response-logger.interceptor";

@Module({

  // --- Providers ---

  providers: [GlobalExceptionFilter, ResponseLoggerInterceptor],
  exports: [GlobalExceptionFilter, ResponseLoggerInterceptor],
})
export class CommonModule {}
