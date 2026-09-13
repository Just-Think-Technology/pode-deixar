// Roles guard tests — role-based access decisions

import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../src/guards/roles.guard";
import { ROLES_KEY } from "../src/guards/roles.decorator";

function montarContexto(papeis: string[] | undefined, usuario: unknown) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(papeis),
  } as unknown as Reflector;
  const contexto = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user: usuario }) }),
  } as never;
  return { guarda: new RolesGuard(reflector), contexto };
}

// --- Tests ---

describe("RolesGuard", () => {
  it("libera quando a rota não exige papéis", () => {
    const { guarda, contexto } = montarContexto(undefined, null);
    expect(guarda.canActivate(contexto)).toBe(true);
  });

  it("libera quando o usuário tem um dos papéis exigidos", () => {
    const { guarda, contexto } = montarContexto(["ADMIN", "PROVIDER"], {
      role: "PROVIDER",
    });
    expect(guarda.canActivate(contexto)).toBe(true);
  });

  it("nega com 403 quando o papel não confere", () => {
    const { guarda, contexto } = montarContexto(["ADMIN"], {
      role: "CLIENT",
    });
    expect(() => guarda.canActivate(contexto)).toThrow(ForbiddenException);
  });

  it("nega com 403 quando não há usuário autenticado", () => {
    const { guarda, contexto } = montarContexto(["ADMIN"], null);
    expect(() => guarda.canActivate(contexto)).toThrow(
      "Permissões insuficientes",
    );
  });

  it("usa a mesma chave do decorator Roles", () => {
    expect(ROLES_KEY).toBe("roles");
  });
});
