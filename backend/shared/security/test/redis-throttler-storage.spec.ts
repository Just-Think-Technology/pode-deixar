import { createClient } from 'redis';
import { RedisThrottlerStorage } from '../redis-throttler-storage';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

const mockedCreateClient = createClient as unknown as jest.Mock;

function buildFakeClient(overrides: Record<string, jest.Mock> = {}) {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(true),
    ttl: jest.fn().mockResolvedValue(60),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────
// Regressão: trava o contrato do storage distribuído de rate limiting
// (prefixo de chaves, expiração no primeiro hit, bloqueio por limite e
// fail-open quando o Redis cai — comportamento atual documentado aqui).

describe('RedisThrottlerStorage (shared)', () => {
  let fakeClient: ReturnType<typeof buildFakeClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    fakeClient = buildFakeClient();
    mockedCreateClient.mockReturnValue(fakeClient);
  });

  it('deve criar o cliente com REDIS_URL e conectar', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';

    // eslint-disable-next-line no-new
    new RedisThrottlerStorage();

    expect(mockedCreateClient).toHaveBeenCalledWith({
      url: 'redis://localhost:6379',
    });
    expect(fakeClient.connect).toHaveBeenCalled();
  });

  it('deve usar o prefixo throttler: e definir expiração no primeiro hit', async () => {
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment('user-1', 60000, 100, 0, 'default');

    expect(fakeClient.incr).toHaveBeenCalledWith('throttler:user-1:default');
    expect(fakeClient.expire).toHaveBeenCalledWith(
      'throttler:user-1:default',
      60,
    );
    expect(result).toEqual({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it('não deve renovar expiração nos hits seguintes', async () => {
    fakeClient.incr.mockResolvedValue(2);
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment('user-1', 60000, 100, 0, 'default');

    expect(fakeClient.expire).not.toHaveBeenCalled();
    expect(result.totalHits).toBe(2);
    expect(result.isBlocked).toBe(false);
  });

  it('deve bloquear quando ultrapassar o limite', async () => {
    fakeClient.incr.mockResolvedValue(101);
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment('user-1', 60000, 100, 30000, 'default');

    expect(result.isBlocked).toBe(true);
    expect(result.timeToBlockExpire).toBe(30000);
  });

  it('deve usar o ttl informado quando o Redis não retornar ttl', async () => {
    fakeClient.ttl.mockResolvedValue(-1);
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment('user-1', 45000, 100, 0, 'default');

    expect(result.timeToExpire).toBe(45000);
  });

  it('deve falhar aberto (não bloquear) quando o Redis lançar erro', async () => {
    fakeClient.incr.mockRejectedValueOnce(new Error('Redis down'));
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment('user-1', 60000, 100, 0, 'default');

    expect(result).toEqual({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });
});
