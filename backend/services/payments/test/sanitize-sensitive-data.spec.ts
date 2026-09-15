import { sanitizeSensitiveData } from "@pode-deixar/security";

describe("sanitizeSensitiveData", () => {
  it("should fully redact the card number", () => {
    const result = sanitizeSensitiveData("cartão 4111111111111111 pago");
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("4111111111111111");
  });

  it("should redact the card number with spaces", () => {
    const result = sanitizeSensitiveData("numero 4111 1111 1111 1111 cvv 123");
    expect(result).not.toContain("4111 1111 1111 1111");
  });

  it("should redact the CVV after a sensitive field", () => {
    const result = sanitizeSensitiveData(
      '{"cvv": "123", "card_number":"4111111111111111"}',
    );
    expect(result).toContain('"cvv": [REDACTED]');
    expect(result).not.toContain('"123"');
  });

  it("should not redact common text", () => {
    const result = sanitizeSensitiveData(
      "pedido pago com sucesso em 2026-08-08",
    );
    expect(result).toContain("2026-08-08");
    expect(result).not.toContain("[CARD-");
  });

  it("should return empty when given empty", () => {
    expect(sanitizeSensitiveData("")).toBe("");
  });
});
