// User decorator — authenticated user param extraction

import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

export interface IUser {
  sub: string;
  email: string;
  role: string;
  jti?: string;
}

export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IUser | undefined;
    if (data === undefined) {
      return user?.sub || user?.email || user?.role || "";
    }

    const value = user?.[data as keyof IUser];
    if (value === undefined || value === null) {
      throw new UnauthorizedException("Usuário não autenticado");
    }
    return value;
  },
);
