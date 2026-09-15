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

    const { status, message, errors } = this.resolveError(exception);

    // Server-side log keeps the original detail (message + stack).
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

  private resolveError(exception: unknown): {
    status: number;
    message: string;
    errors: string[];
  } {
    if (exception instanceof HttpException) {
      return this.resolveHttpError(exception);
    }
    if (exception instanceof Error) {
      return this.resolveUnknownError(exception);
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Erro interno do servidor",
      errors: [],
    };
  }

  private resolveHttpError(exception: HttpException): {
    status: number;
    message: string;
    errors: string[];
  } {
    const status = exception.getStatus();
    const body = exception.getResponse();
    if (typeof body === "string") {
      return { status, message: body, errors: [] };
    }
    if (typeof body === "object" && body !== null) {
      const resp = body as Record<string, unknown>;
      const message =
        typeof resp.message === "string"
          ? resp.message
          : exception.message;
      const errors = Array.isArray(resp.message)
        ? resp.message.filter(
            (item): item is string => typeof item === "string",
          )
        : [];
      return { status, message, errors };
    }
    return {
      status,
      message: exception.message,
      errors: [],
    };
  }

  private resolveUnknownError(exception: Error): {
    status: number;
    message: string;
    errors: string[];
  } {
    // Known Prisma errors become generic responses by code, without
    // leaking internal details (table, field, constraint) to the client.
    // Any other error becomes generic 500; detail stays in the log only.
    const resolved = resolverErroPrisma(
      (exception as { code?: unknown }).code,
    );
    if (resolved) {
      return { status: resolved.status, message: resolved.message, errors: [] };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Erro interno do servidor",
      errors: [],
    };
  }
}
