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
import { resolvePrismaError } from "./resolve-prisma-error";

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
      // Known Prisma errors become generic code-based responses, without
      // exposing internals (table, column, constraint) to the client.
      // Anything else becomes a generic 500; detail stays in the log only.
      const resolved = resolvePrismaError(
        (exception as { code?: unknown }).code,
      );
      if (resolved) {
        status = resolved.status;
        message = resolved.message;
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = "Erro interno do servidor";
      }
    }

    // Server-side logging keeps the original detail (message + stack).
    const detail =
      exception instanceof Error ? exception.message : String(exception);

    this.logger.error(
      sanitizeSensitiveData(
        `${request.method} ${request.url} - ${status} - ${detail}`,
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
