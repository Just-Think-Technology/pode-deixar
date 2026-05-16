import { Injectable, Logger } from '@nestjs/common';
import * as winston from 'winston';
import getLogger from './shared-logger';

@Injectable()
export class AuthLoggerService extends Logger {
  private winstonLogger: winston.Logger;
  private shared: ReturnType<typeof getLogger>;

  constructor() {
    super('AuthLogger');
    this.winstonLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'auth-service' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });

    this.shared = getLogger('auth-service');
  }

  logLoginAttempt(email: string, success: boolean, ip?: string, userAgent?: string) {
    const context = 'auth.login';
    const message = success
      ? `User ${email} authenticated successfully`
      : `Failed login attempt for email ${email}`;
    this.shared[success ? 'info' : 'error'](context, message);
    this.winstonLogger.info(message, { event: 'login_attempt', email, success, ip, userAgent });
  }

  logRegistration(email: string, role: string, ip?: string) {
    const context = 'auth.register';
    const message = `New user registered with email ${email}`;
    this.shared.info(context, message);
    this.winstonLogger.info(message, { event: 'user_registration', email, role, ip });
  }

  logPasswordReset(email: string, success: boolean) {
    const context = 'auth.password_reset';
    const message = success
      ? `Password reset requested for ${email}`
      : `Password reset failed for ${email}`;
    this.shared[success ? 'info' : 'error'](context, message);
    this.winstonLogger.info(message, { event: 'password_reset', email, success });
  }

  logTokenRefresh(userId: string, success: boolean) {
    const context = 'token.refresh';
    const message = success
      ? `Token refreshed for user ${userId}`
      : `Token refresh failed for user ${userId}`;
    this.shared.token[success ? 'info' : 'error'](context, message);
    this.winstonLogger.info(message, { event: 'token_refresh', userId, success });
    if (!success) {
      this.shared.error(context, `token.refresh failure for ${userId}`);
    }
  }

  logSecurityEvent(event: string, details: any) {
    const context = `security.${event}`;
    const message = typeof details === 'string' ? details : JSON.stringify(details);
    this.shared.warn(context, message);
    this.winstonLogger.warn('Security event', { event, ...details });
  }

  logLogout(userId: string, email?: string) {
    const context = 'auth.logout';
    const message = email ? `User ${userId} (${email}) logged out` : `User ${userId} logged out`;
    this.shared.info(context, message);
    this.winstonLogger.info(message, { event: 'logout', userId, email });
  }
}
