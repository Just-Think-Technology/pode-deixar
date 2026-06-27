import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
<<<<<<< HEAD
      throw new ForbiddenException("Permissões insuficientes");
=======
      throw new ForbiddenException("Insufficient permissions");
>>>>>>> 68d7f77 (Develop (#13))
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
<<<<<<< HEAD
      throw new ForbiddenException("Permissões insuficientes");
=======
      throw new ForbiddenException("Insufficient permissions");
>>>>>>> 68d7f77 (Develop (#13))
    }

    return true;
  }
}
