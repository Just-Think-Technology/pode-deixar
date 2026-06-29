import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import getLogger from '../shared/shared-logger';

const logger = getLogger('jwt');

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
        logger.warn(
          'auth.jwt',
          `Tentativa de acesso não autorizado de ${ip} - ${e.message}`,
        );
      } catch {}
      throw e;
    }
  }
}
