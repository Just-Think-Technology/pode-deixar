// Response logger interceptor — sanitized HTTP audit logs

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";
import { sanitizeSensitiveData } from "./sanitize-sensitive-data";

@Injectable()
export class ResponseLoggerInterceptor implements NestInterceptor {

  // --- Private Helpers ---

  private readonly logger = new Logger(ResponseLoggerInterceptor.name);

  // --- Public API ---

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          this.logger.log(
            sanitizeSensitiveData(
              `${request.method} ${request.url} - ${response.statusCode} - ${duration}ms`,
            ),
          );
        },
        error: (error: any) => {
          const duration = Date.now() - now;
          this.logger.error(
            sanitizeSensitiveData(
              `${request.method} ${request.url} - ${error.status || 500} - ${duration}ms`,
            ),
            sanitizeSensitiveData(error.stack || ""),
          );
        },
      }),
    );
  }
}
