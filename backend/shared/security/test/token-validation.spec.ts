// Token validation tests — payload and revocation checks

import { UnauthorizedException } from "@nestjs/common";
import {
  assertTokenPayload,
  checkTokenRevocation,
} from "../src/token-validation";

// --- Tests ---

describe("assertTokenPayload", () => {
  it("aceita payload com sub e role", () => {
    expect(() =>
      assertTokenPayload({ sub: "u1", role: "CLIENT", jti: "j1" }),
    ).not.toThrow();
  });

  it("rejeita payload nulo", () => {
    expect(() => assertTokenPayload(null)).toThrow(UnauthorizedException);
    expect(() => assertTokenPayload(null)).toThrow("Payload do token inválido");
  });

  it("rejeita payload sem sub", () => {
    expect(() => assertTokenPayload({ role: "CLIENT" })).toThrow(
      "Payload do token inválido",
    );
  });

  it("rejeita payload sem role", () => {
    expect(() => assertTokenPayload({ sub: "u1" })).toThrow(
      "Payload do token inválido",
    );
  });
});

describe("checkTokenRevocation", () => {
  it("ignora jti ausente sem consultar a blacklist", async () => {
    const buscar = jest.fn();
    await checkTokenRevocation(buscar, undefined);
    expect(buscar).not.toHaveBeenCalled();
  });

  it("aceita token fora da blacklist", async () => {
    await expect(
      checkTokenRevocation(async () => null, "j1"),
    ).resolves.toBeUndefined();
  });

  it("rejeita token na blacklist", async () => {
    await expect(
      checkTokenRevocation(async () => ({ jti: "j1" }), "j1"),
    ).rejects.toThrow("Token revogado");
  });

  it("aceita token quando a tabela não existe (P2021)", async () => {
    const erro = Object.assign(new Error("tabela ausente"), { code: "P2021" });
    await expect(
      checkTokenRevocation(async () => {
        throw erro;
      }, "j1"),
    ).resolves.toBeUndefined();
  });

  it("relança qualquer outro erro de lookup", async () => {
    const erro = Object.assign(new Error("banco fora"), { code: "P1001" });
    await expect(
      checkTokenRevocation(async () => {
        throw erro;
      }, "j1"),
    ).rejects.toBe(erro);
  });
});
