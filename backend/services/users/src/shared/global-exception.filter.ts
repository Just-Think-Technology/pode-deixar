import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { sanitizeSensitiveData } from "@pode-deixar/security";

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
      // Map known Prisma errors to generic responses to avoid leaking internals.
      // Any other error becomes a generic 500; details stay in the log only.
      const code = (exception as { code?: unknown }).code;
      if (code === "P2002") {
        status = HttpStatus.CONFLICT;
        message = "Registro já existe";
      } else if (code === "P2003") {
        status = HttpStatus.BAD_REQUEST;
        message = "Referência inválida";
      } else if (code === "P2025") {
        status = HttpStatus.NOT_FOUND;
        message = "Registro não encontrado";
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = "Erro interno do servidor";
      }
    }

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
