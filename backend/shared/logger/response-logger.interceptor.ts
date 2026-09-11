import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { sanitizeSensitiveData } from '@pode-deixar/security';
import { createLogger } from './index';

export function createResponseLoggerInterceptor(
  serviceName: string,
): Type<NestInterceptor> {
  @Injectable()
  class ResponseLoggerInterceptor implements NestInterceptor {
    private readonly logger = createLogger(serviceName, 'http');

    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<unknown> {
      const httpContext = context.switchToHttp();
      const request = httpContext.getRequest<Request>();
      const response = httpContext.getResponse<Response>();
      const { method, originalUrl, url } = request as Request & {
        originalUrl?: string;
      };
      const route = originalUrl || url;
      const start = Date.now();

      return next.handle().pipe(
        tap((responseBody: unknown) => {
          const durationMs = Date.now() - start;
          this.logger.info(
            {
              event: 'http.response',
              method,
              route,
              statusCode: response.statusCode,
              durationMs,
              response: sanitizeSensitiveData(responseBody),
            },
            `HTTP ${method} ${route} ${response.statusCode} ${durationMs}ms`,
          );
        }),
        catchError((err: unknown) => {
          const durationMs = Date.now() - start;
          const error = err instanceof Error ? err : new Error(String(err));

          this.logger.error(
            {
              event: 'http.response.error',
              method,
              route,
              statusCode: response.statusCode || 500,
              durationMs,
              error: error.message,
              stack: error.stack,
            },
            `HTTP ${method} ${route} ${response.statusCode || 500} ${durationMs}ms - ${error.message}`,
          );

          return throwError(() => err);
        }),
      );
    }
  }

  return ResponseLoggerInterceptor;
}
