// JWT guard — access-token authentication with IP logging

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import getLogger from '../shared/shared-logger';

const logger = getLogger('jwt');

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // --- Public API ---

  handleRequest(
    err: unknown,
    user: unknown,
    info: unknown,
    context: ExecutionContext,
  ) {
    try {
      return super.handleRequest(err, user, info, context);
    } catch (e) {
      try {
        const req = context.switchToHttp().getRequest();
        const ip = req.headers?.['x-forwarded-for'] || req.ip;
        const reason = e instanceof Error ? e.message : String(e);
        logger.warn(
          'auth.jwt',
          `Unauthorized access attempt from ${ip} - ${reason}`,
        );
      } catch {}
      throw e;
    }
  }
}
