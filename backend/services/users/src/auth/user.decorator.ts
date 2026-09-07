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
    // Sem chave: mantém o comportamento legado (id, email ou função).
    if (data === undefined) {
      return user?.sub || user?.email || user?.role || "";
    }
    // Com chave: retorna a propriedade pedida e rejeita quando ausente.

    const valor = user?.[data as keyof IUser];
    if (valor === undefined || valor === null) {
      throw new UnauthorizedException("Usuário não autenticado");
    }
    return valor;
  },
);
