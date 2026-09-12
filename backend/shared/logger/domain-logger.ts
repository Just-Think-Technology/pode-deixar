import { createLogger, LoggerWithEvent } from './index';

export abstract class BaseDomainLogger {
  protected readonly logger: LoggerWithEvent;

  protected constructor(serviceName: string) {
    this.logger = createLogger(serviceName);
  }

  logInfo(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.info(event, message, meta);
  }

  logWarn(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.warn(event, message, meta);
  }

  logError(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.error(event, message, meta);
  }

  logDebug(event: string, message: string, meta?: Record<string, unknown>) {
    this.logger.debug(event, message, meta);
  }

  logSecurityEvent(event: string, meta: Record<string, unknown>) {
    this.logger.warn(event, `Security event: ${event}`, meta);
  }
}
