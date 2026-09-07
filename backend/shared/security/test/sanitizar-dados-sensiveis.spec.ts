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
});
