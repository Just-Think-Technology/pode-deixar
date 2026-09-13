// Auth logger — PII-safe authentication audit events

import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import createLogger from '@pode-deixar/logger';

// Email is SHA-256 hashed for forensic correlation without exposing PII; IP is kept intact for lockout analysis.
export function anonymizeEmailForLog(email: string): string {
  return createHash('sha256').update(email).digest('hex');
}

@Injectable()
export class AuthLoggerService {
  private readonly logger = createLogger('auth-service');

  // --- Public API ---

  logLoginAttempt(email: string, success: boolean, ip?: string) {
    const emailHash = anonymizeEmailForLog(email);
    this.logger.info(
      { event: 'auth.login_attempt', emailHash, success, ip },
      success ? 'Login succeeded' : 'Login failed',
    );
  }

  logSecurityEvent(event: string, payload: Record<string, unknown>) {
    const { email, ...rest } = payload as { email?: unknown } & Record<
      string,
      unknown
    >;
    this.logger.warn(
      {
        event,
        ...(typeof email === 'string'
          ? { emailHash: anonymizeEmailForLog(email) }
          : {}),
        ...rest,
      },
      `Security event: ${event}`,
    );
  }

  logTokenRefresh(userId: string, success: boolean) {
    this.logger.info(
      { event: 'auth.token_refresh', userId, success },
      success ? 'Refresh token succeeded' : 'Refresh token failed',
    );
  }

  logLogout(userId: string, email?: string) {
    this.logger.info(
      {
        event: 'auth.logout',
        userId,
        ...(email ? { emailHash: anonymizeEmailForLog(email) } : {}),
      },
      'User logged out',
    );
  }

  logPasswordResetRequested(email: string, success: boolean) {
    this.logger.info(
      {
        event: 'auth.password_reset_requested',
        emailHash: anonymizeEmailForLog(email),
        success,
      },
      success ? 'Password reset requested' : 'Password reset request failed',
    );
  }

  logPasswordReset(email: string, success: boolean) {
    this.logger.info(
      {
        event: 'auth.password_reset',
        emailHash: anonymizeEmailForLog(email),
        success,
      },
      success ? 'Password reset email sent' : 'Password reset failed',
    );
  }

  logPasswordResetComplete(email: string) {
    this.logger.info(
      {
        event: 'auth.password_reset_complete',
        emailHash: anonymizeEmailForLog(email),
      },
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
      {
        event: 'auth.registration',
        emailHash: anonymizeEmailForLog(email),
        role,
        ip,
      },
      'User registration completed',
    );
  }

  logEmailVerificationTokenFailure(token: string, reason: string) {
    this.logger.warn(
      {
        event: 'auth.email_verification_token_failure',
        token_matches: token ? token.slice(-4) : undefined,
        reason,
      },
      'Email verification token failure',
    );
  }

  logEmailVerification(email: string, success: boolean, reason?: string) {
    this.logger.info(
      {
        event: 'auth.email_verification',
        emailHash: anonymizeEmailForLog(email),
        success,
        reason,
      },
      success ? 'Email verified' : 'Email verification failed',
    );
  }

  logResendVerification(email: string, success: boolean) {
    this.logger.info(
      {
        event: 'auth.resend_verification',
        emailHash: anonymizeEmailForLog(email),
        success,
      },
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
