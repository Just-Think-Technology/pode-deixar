// Sanitize tests — sensitive data redaction

import { sanitizeSensitiveData } from '../src/sanitize-sensitive-data';

// --- Tests ---

// PCI-DSS: sensitive data must never leak into structured logs.

describe('sanitizeSensitiveData (shared)', () => {
  it('should redact password in string', () => {
    expect(sanitizeSensitiveData('password=supersecreta')).toBe(
      'password=[REDACTED]',
    );
  });

  it('should redact cvv in string with colon', () => {
    const result = sanitizeSensitiveData('cvv: 123') as string;

    expect(result).not.toContain('123');
    expect(result).toContain('[REDACTED]');
  });

  it('should redact sensitive key values in objects', () => {
    const result = sanitizeSensitiveData({
      email: 'user@example.com',
      refresh_token: 'tok-abc-123',
      access_token: 'tok-def-456',
      authorization: 'Bearer xyz',
    }) as Record<string, unknown>;

    expect(result.email).toBe('user@example.com');
    expect(result.refresh_token).toBe('[REDACTED]');
    expect(result.access_token).toBe('[REDACTED]');
    expect(result.authorization).toBe('[REDACTED]');
  });

  it('should redact PAN and CVV in payment objects', () => {
    const result = sanitizeSensitiveData({
      card_number: '4111111111111111',
      cvv: '123',
      amount: 150.0,
    }) as Record<string, unknown>;

    expect(result.card_number).toBe('[REDACTED]');
    expect(result.cvv).toBe('[REDACTED]');
    expect(result.amount).toBe(150.0);
  });

  it('should recurse into nested objects and arrays', () => {
    const result = sanitizeSensitiveData({
      user: { name: 'João', password: 'segredo' },
      attempts: ['password=abc', 'ok'],
    }) as any;

    expect(result.user.name).toBe('João');
    expect(result.user.password).toBe('[REDACTED]');
    expect(result.attempts[0]).toBe('password=[REDACTED]');
    expect(result.attempts[1]).toBe('ok');
  });

  it('should preserve non-string primitives and innocent values', () => {
    expect(sanitizeSensitiveData(42)).toBe(42);
    expect(sanitizeSensitiveData(true)).toBe(true);
    expect(sanitizeSensitiveData(null)).toBe(null);
    expect(sanitizeSensitiveData(undefined)).toBe(undefined);
    expect(sanitizeSensitiveData('mensagem comum')).toBe('mensagem comum');
  });

  it('should redact bare PAN with valid Luhn in string', () => {
    expect(sanitizeSensitiveData('cartão 4111111111111111 aprovado')).toBe(
      'cartão [REDACTED] aprovado',
    );
  });

  it('should redact bare PAN with separators when Luhn is valid', () => {
    const result = sanitizeSensitiveData(
      'cartão 4111-1111-1111-1111 aprovado',
    ) as string;

    expect(result).not.toContain('4111');
    expect(result).toContain('[REDACTED]');
  });

  it('should not redact a 16-digit sequence with invalid Luhn', () => {
    expect(sanitizeSensitiveData('pedido 4111111111111112')).toBe(
      'pedido 4111111111111112',
    );
  });

  it('should redact bare CPF formatted and digits-only', () => {
    expect(sanitizeSensitiveData('cpf 529.982.247-25')).toBe(
      'cpf [REDACTED]',
    );
    expect(sanitizeSensitiveData('cpf 52998224725')).toBe('cpf [REDACTED]');
  });

  it('should redact new spellings of sensitive keys in objects', () => {
    const result = sanitizeSensitiveData({
      apiKey: 'abc-123',
      api_key: 'def-456',
      client_secret: 'segredo',
      cookie: 'sess=1',
      session: 'sess-2',
      pix: 'chave-pix',
      cnpj: '11222333000181',
      cpf: '52998224725',
      cardnum: '4111111111111111',
      name: 'Maria',
    }) as Record<string, unknown>;

    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.api_key).toBe('[REDACTED]');
    expect(result.client_secret).toBe('[REDACTED]');
    expect(result.cookie).toBe('[REDACTED]');
    expect(result.session).toBe('[REDACTED]');
    expect(result.pix).toBe('[REDACTED]');
    expect(result.cnpj).toBe('[REDACTED]');
    expect(result.cpf).toBe('[REDACTED]');
    expect(result.cardnum).toBe('[REDACTED]');
    expect(result.name).toBe('Maria');
  });

  it('should ignore prototype pollution keys without polluting the prototype', () => {
    const input = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"x":1},"prototype":{"y":2},"name":"ok"}',
    );
    const result = sanitizeSensitiveData(input) as Record<string, unknown>;

    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(
      false,
    );
    expect(
      Object.prototype.hasOwnProperty.call(result, 'constructor'),
    ).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(
      false,
    );
    expect(result.name).toBe('ok');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('should not overflow the stack with circular structures', () => {
    const circular: Record<string, unknown> = { name: 'ok' };
    circular.self = circular;

    const result = sanitizeSensitiveData(circular) as Record<string, unknown>;

    expect(result.name).toBe('ok');
    expect(result.self).toBe('[CIRCULAR]');
  });
});
