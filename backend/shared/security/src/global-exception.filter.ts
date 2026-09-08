import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { sanitizarDadosSensiveis } from "./sanitizar-dados-sensiveis";
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
      // Erros conhecidos do Prisma viram respostas genéricas por código,
      // sem expor detalhes internos (tabela, campo, constraint) ao cliente.
      // Qualquer outro erro vira 500 genérico; o detalhe fica só no log.
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

    // Log server-side mantém o detalhe original (mensagem + stack).
    const detalhe =
      exception instanceof Error ? exception.message : String(exception);

    this.logger.error(
      sanitizarDadosSensiveis(
        `${request.method} ${request.url} - ${status} - ${detalhe}`,
      ),
      sanitizarDadosSensiveis(
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
