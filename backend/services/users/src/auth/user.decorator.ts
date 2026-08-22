import { SetMetadata, createParamDecorator, ExecutionContext } from "@nestjs/common";

export const User = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?._id || request.user?.id || request.user;
});