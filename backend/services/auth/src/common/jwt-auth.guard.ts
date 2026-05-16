import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import getLogger from './shared-logger';

const logger = getLogger('auth-service');

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    try {
      const result = super.handleRequest(err, user, info, context);
      return result;
    } catch (e) {
      try {
        const req = context.switchToHttp().getRequest();
        const ip = req.headers?.['x-forwarded-for'] || req.ip;
        logger.warn('auth.jwt', `Unauthorized access attempt from ${ip} - ${e.message}`);
      } catch (_) {}
      throw e;
    }
  }
}
