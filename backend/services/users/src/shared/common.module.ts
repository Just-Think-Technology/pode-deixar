import { Module } from "@nestjs/common";
import { GlobalExceptionFilter } from "./global-exception.filter";
import { ResponseLoggerInterceptor } from "./response-logger.interceptor";

@Module({
  providers: [GlobalExceptionFilter, ResponseLoggerInterceptor],
  exports: [GlobalExceptionFilter, ResponseLoggerInterceptor],
})
export class CommonModule {}
