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
import { sanitizarDadosSensiveis } from "./sanitizar-dados-sensiveis";

@Injectable()
export class ResponseLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseLoggerInterceptor.name);

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
            sanitizarDadosSensiveis(
              `${request.method} ${request.url} - ${response.statusCode} - ${duration}ms`,
            ),
          );
        },
        error: (error: any) => {
          const duration = Date.now() - now;
          this.logger.error(
            sanitizarDadosSensiveis(
              `${request.method} ${request.url} - ${error.status || 500} - ${duration}ms`,
            ),
            sanitizarDadosSensiveis(error.stack || ""),
          );
        },
      }),
    );
  }
}
