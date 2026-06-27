import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  private translateMessage(msg: string): string {
    const translations: Record<string, string> = {
      'Unauthorized': 'Não autorizado',
      'Forbidden': 'Acesso negado',
      'Not Found': 'Não encontrado',
      'Conflict': 'Conflito',
      'Bad Request': 'Requisição inválida',
      'Internal Server Error': 'Erro interno do servidor',
    };
    return translations[msg] || msg;
  }

  private getDefaultErrorForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST: return 'Requisição Inválida';
      case HttpStatus.UNAUTHORIZED: return 'Não Autorizado';
      case HttpStatus.FORBIDDEN: return 'Proibido';
      case HttpStatus.NOT_FOUND: return 'Não Encontrado';
      case HttpStatus.CONFLICT: return 'Conflito';
      case HttpStatus.TOO_MANY_REQUESTS: return 'Muitas Requisições';
      default: return 'Erro Interno do Servidor';
    }
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let error = 'Erro Interno do Servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = this.translateMessage(exceptionResponse);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message
          ? (Array.isArray(responseObj.message)
            ? responseObj.message.map((m: string) => this.translateMessage(m))
            : this.translateMessage(responseObj.message))
          : message;
        error = responseObj.error || this.getDefaultErrorForStatus(status);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    const responseMessage = isProduction && status === HttpStatus.INTERNAL_SERVER_ERROR
      ? 'Erro interno do servidor'
      : message;

    response.status(status).json({
      statusCode: status,
      message: responseMessage,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}