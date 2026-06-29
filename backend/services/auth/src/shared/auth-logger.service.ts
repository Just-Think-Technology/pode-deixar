import { Injectable } from '@nestjs/common';
import createLogger from '@pode-deixar/logger';

@Injectable()
export class AuthLoggerService {
  private readonly logger = createLogger('auth-service');

  logLoginAttempt(email: string, success: boolean, ip?: string) {
    this.logger.info(
      { event: 'auth.login_attempt', email, success, ip },
      success ? 'Login succeeded' : 'Login failed',
    );
  }

  logSecurityEvent(event: string, payload: Record<string, unknown>) {
    this.logger.warn({ event, ...payload }, `Security event: ${event}`);
  }

  logTokenRefresh(userId: string, success: boolean) {
    this.logger.info(
      { event: 'auth.token_refresh', userId, success },
      success ? 'Refresh token succeeded' : 'Refresh token failed',
    );
  }

  logLogout(userId: string, email?: string) {
    this.logger.info(
      { event: 'auth.logout', userId, email },
      'User logged out',
    );
  }

  logPasswordResetRequested(email: string, success: boolean) {
    this.logger.info(
      { event: 'auth.password_reset_requested', email, success },
      success ? 'Password reset requested' : 'Password reset request failed',
    );
  }

  logPasswordReset(email: string, success: boolean) {
    this.logger.info(
      { event: 'auth.password_reset', email, success },
      success ? 'Password reset email sent' : 'Password reset failed',
    );
  }

  logPasswordResetComplete(email: string) {
    this.logger.info(
      { event: 'auth.password_reset_complete', email },
      'Password reset completed',
    );
  }

  logPasswordChange(userId: string, success: boolean) {
    this.logger.info(
      { event: 'auth.password_change', userId, success },
      success ? 'Password changed' : 'Password change failed',
    );
  }

  logRegistration(email: string, role: string, ip?: string) {
    this.logger.info(
      { event: 'auth.registration', email, role, ip },
      'User registration completed',
    );
  }

  logEmailVerificationTokenFailure(token: string, reason: string) {
    this.logger.warn(
      { event: 'auth.email_verification_token_failure', token, reason },
      'Email verification token failure',
    );
  }

  logEmailVerification(email: string, success: boolean, reason?: string) {
    this.logger.info(
      { event: 'auth.email_verification', email, success, reason },
      success ? 'Email verified' : 'Email verification failed',
    );
  }

  logResendVerification(email: string, success: boolean) {
    this.logger.info(
      { event: 'auth.resend_verification', email, success },
      success ? 'Verification email resent' : 'Resend verification failed',
    );
  }

  logTokenVerification(userId: string, success: boolean, reason?: string) {
    this.logger.info(
      { event: 'auth.token_verify', userId, success, reason },
      success
        ? 'Token verified successfully'
        : `Token verification failed: ${reason}`,
    );
  }
}
