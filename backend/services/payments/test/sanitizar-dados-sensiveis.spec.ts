import { sanitizarDadosSensiveis } from "../src/shared/sanitizar-dados-sensiveis";

describe("sanitizarDadosSensiveis", () => {
  it("deve redigir número completo de cartão, mantendo só os últimos 4", () => {
    const resultado = sanitizarDadosSensiveis(
      "cartão 4111111111111111 pago",
    );
    expect(resultado).toContain("[CARD-****1111]");
    expect(resultado).not.toContain("4111111111111111");
  });

  it("deve redigir número de cartão com espaços", () => {
    const resultado = sanitizarDadosSensiveis(
      "numero 4111 1111 1111 1111 cvv 123",
    );
    expect(resultado).not.toContain("4111 1111 1111 1111");
  });

  it("deve redigir o CVV após campo sensível", () => {
    const resultado = sanitizarDadosSensiveis(
      '{"cvv": "123", "card_number":"4111111111111111"}',
    );
    expect(resultado).toContain('"cvv": [REDACTED]');
    expect(resultado).not.toContain('"123"');
  });

  it("não deve redigir textos comuns", () => {
    const resultado = sanitizarDadosSensiveis(
      "pedido pago com sucesso em 2026-08-08",
    );
    expect(resultado).toContain("2026-08-08");
    expect(resultado).not.toContain("[CARD-");
  });

  it("deve retornar vazio quando recebe vazio", () => {
    expect(sanitizarDadosSensiveis("")).toBe("");
  });
});