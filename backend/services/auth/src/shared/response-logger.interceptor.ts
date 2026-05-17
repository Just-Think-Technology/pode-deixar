import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import createLogger from '@pode-deixar/logger';

const logger = createLogger('auth-service', 'http');

@Injectable()
export class ResponseLoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const { method, originalUrl, url } = request as Request & { originalUrl?: string };
    const route = originalUrl || url;
    const start = Date.now();

    return next.handle().pipe(
      tap((responseBody) => {
        const durationMs = Date.now() - start;
        logger.info(
          {
            event: 'http.response',
            method,
            route,
            statusCode: response.statusCode,
            durationMs,
            response: responseBody,
          },
          `HTTP ${method} ${route} ${response.statusCode} ${durationMs}ms`,
        );
      }),
    );
  }
}
