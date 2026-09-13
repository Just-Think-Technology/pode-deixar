// Global exception filter — unified HTTP error responses

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { sanitizeSensitiveData } from "./sanitize-sensitive-data";
import { resolverErroPrisma } from "./resolver-erro-prisma";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Erro interno do servidor";
    let errors: string[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === "object" &&
        exceptionResponse !== null
      ) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        if (Array.isArray(resp.message)) {
          errors = resp.message as string[];
        }
      }
    } else if (exception instanceof Error) {
      // Known Prisma errors become generic responses by code, without
      // leaking internal details (table, field, constraint) to the client.
      // Any other error becomes generic 500; detail stays in the log only.
      const resolvido = resolverErroPrisma(
        (exception as { code?: unknown }).code,
      );
      if (resolvido) {
        status = resolvido.status;
        message = resolvido.message;
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = "Erro interno do servidor";
      }
    }

    // Server-side log keeps the original detail (message + stack).
    const detalhe =
      exception instanceof Error ? exception.message : String(exception);

    this.logger.error(
      sanitizeSensitiveData(
        `${request.method} ${request.url} - ${status} - ${detalhe}`,
      ),
      sanitizeSensitiveData(
        exception instanceof Error ? exception.stack || "" : "",
      ),
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(errors.length > 0 && { errors }),
    });
  }
}
