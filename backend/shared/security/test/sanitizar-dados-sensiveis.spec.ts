import { sanitizarDadosSensiveis } from '../src/sanitizar-dados-sensiveis';

// ─── Tests ──────────────────────────────────────────────────────────────────
// Regressão PCI-DSS: garante que PAN/CVV/tokens/segredos nunca vazem em logs.
// Qualquer afrouxamento aqui expõe dados sensíveis nos logs estruturados.

describe('sanitizarDadosSensiveis (shared)', () => {
  it('deve redactar password em string', () => {
    expect(sanitizarDadosSensiveis('password=supersecreta')).toBe(
      'password=[REDACTED]',
    );
  });

  it('deve redactar cvv em string com dois-pontos', () => {
    const result = sanitizarDadosSensiveis('cvv: 123') as string;

    expect(result).not.toContain('123');
    expect(result).toContain('[REDACTED]');
  });

  it('deve redactar valores de chaves sensíveis em objetos', () => {
    const result = sanitizarDadosSensiveis({
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

  it('deve redactar PAN e CVV em objetos de pagamento', () => {
    const result = sanitizarDadosSensiveis({
      card_number: '4111111111111111',
      cvv: '123',
      amount: 150.0,
    }) as Record<string, unknown>;

    expect(result.card_number).toBe('[REDACTED]');
    expect(result.cvv).toBe('[REDACTED]');
    expect(result.amount).toBe(150.0);
  });

  it('deve recursar em objetos aninhados e arrays', () => {
    const result = sanitizarDadosSensiveis({
      user: { name: 'João', password: 'segredo' },
      attempts: ['password=abc', 'ok'],
    }) as any;

    expect(result.user.name).toBe('João');
    expect(result.user.password).toBe('[REDACTED]');
    expect(result.attempts[0]).toBe('password=[REDACTED]');
    expect(result.attempts[1]).toBe('ok');
  });

  it('deve preservar primitivos não-string e valores inocentes', () => {
    expect(sanitizarDadosSensiveis(42)).toBe(42);
    expect(sanitizarDadosSensiveis(true)).toBe(true);
    expect(sanitizarDadosSensiveis(null)).toBe(null);
    expect(sanitizarDadosSensiveis(undefined)).toBe(undefined);
    expect(sanitizarDadosSensiveis('mensagem comum')).toBe('mensagem comum');
  });

  it('deve redactar PAN solto com Luhn válido em string', () => {
    expect(sanitizarDadosSensiveis('cartão 4111111111111111 aprovado')).toBe(
      'cartão [REDACTED] aprovado',
    );
  });

  it('deve redactar PAN solto com separadores quando o Luhn for válido', () => {
    const result = sanitizarDadosSensiveis(
      'cartão 4111-1111-1111-1111 aprovado',
    ) as string;

    expect(result).not.toContain('4111');
    expect(result).toContain('[REDACTED]');
  });

  it('não deve redactar sequência de 16 dígitos com Luhn inválido', () => {
    expect(sanitizarDadosSensiveis('pedido 4111111111111112')).toBe(
      'pedido 4111111111111112',
    );
  });

  it('deve redactar CPF solto formatado e só-dígitos', () => {
    expect(sanitizarDadosSensiveis('cpf 529.982.247-25')).toBe(
      'cpf [REDACTED]',
    );
    expect(sanitizarDadosSensiveis('cpf 52998224725')).toBe('cpf [REDACTED]');
  });

  it('deve redactar novas grafias de chaves sensíveis em objetos', () => {
    const result = sanitizarDadosSensiveis({
      apiKey: 'abc-123',
      api_key: 'def-456',
      client_secret: 'segredo',
      cookie: 'sess=1',
      session: 'sess-2',
      pix: 'chave-pix',
      cnpj: '11222333000181',
      cpf: '52998224725',
      cardnum: '4111111111111111',
      nome: 'Maria',
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
    expect(result.nome).toBe('Maria');
  });

  it('deve ignorar chaves de prototype pollution sem poluir o protótipo', () => {
    const entrada = JSON.parse(
      '{"__proto__":{"poluido":true},"constructor":{"x":1},"prototype":{"y":2},"nome":"ok"}',
    );
    const result = sanitizarDadosSensiveis(entrada) as Record<string, unknown>;

    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(
      false,
    );
    expect(
      Object.prototype.hasOwnProperty.call(result, 'constructor'),
    ).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, 'prototype')).toBe(
      false,
    );
    expect(result.nome).toBe('ok');
    expect(({} as Record<string, unknown>).poluido).toBeUndefined();
  });

  it('não deve estourar pilha com estruturas circulares', () => {
    const circular: Record<string, unknown> = { nome: 'ok' };
    circular.eu = circular;

    const result = sanitizarDadosSensiveis(circular) as Record<string, unknown>;

    expect(result.nome).toBe('ok');
    expect(result.eu).toBe('[CIRCULAR]');
  });
});
