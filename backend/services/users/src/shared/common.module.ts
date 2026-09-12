import { Module } from "@nestjs/common";
import { GlobalExceptionFilter } from "./global-exception.filter";
import { createResponseLoggerInterceptor } from "@pode-deixar/logger";

const ResponseLoggerInterceptor =
  createResponseLoggerInterceptor("users-service");

@Module({
  providers: [GlobalExceptionFilter, ResponseLoggerInterceptor],
  exports: [GlobalExceptionFilter, ResponseLoggerInterceptor],
})
export class CommonModule {}
