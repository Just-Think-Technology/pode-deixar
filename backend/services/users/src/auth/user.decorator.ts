import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface IUser {
  sub: string;
  email: string;
  role: string;
  jti?: string;
}

export const User = createParamDecorator(
  (_data: string | undefined, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IUser;
    return user?.sub || user?.email || user?.role || "";
  },
);
