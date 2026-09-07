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
    set: jest.fn().mockResolvedValue('OK'),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(true),
    ttl: jest.fn().mockResolvedValue(60),
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────
// Regressão: trava o contrato do storage distribuído de rate limiting
// (prefixo de chaves, SET NX EX atômico no primeiro hit, extensão da
// expiração quando bloqueado e fail-CLOSED quando o Redis cai — admitir
// sem contar (fail-open) deixaria o rate limit inoperante na queda do Redis).

describe('RedisThrottlerStorage (shared)', () => {
  let fakeClient: ReturnType<typeof buildFakeClient>;
  const OLD_PREFIX = process.env.THROTTLER_PREFIX;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.THROTTLER_PREFIX;
    fakeClient = buildFakeClient();
    mockedCreateClient.mockReturnValue(fakeClient);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (OLD_PREFIX === undefined) delete process.env.THROTTLER_PREFIX;
    else process.env.THROTTLER_PREFIX = OLD_PREFIX;
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

  it('deve usar o prefixo throttler: por padrão e SET NX EX atômico no primeiro hit', async () => {
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment('user-1', 60000, 100, 0, 'default');

    expect(fakeClient.set).toHaveBeenCalledWith(
      'throttler:user-1:default',
      '1',
      { EX: 60, NX: true },
    );
    // Chave criada pelo SET: sem INCR e sem EXPIRE adicional.
    expect(fakeClient.incr).not.toHaveBeenCalled();
    expect(fakeClient.expire).not.toHaveBeenCalled();
    expect(result).toEqual({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it('deve respeitar THROTTLER_PREFIX quando configurado', async () => {
    process.env.THROTTLER_PREFIX = 'tenant-a:';
    const storage = new RedisThrottlerStorage();

    await storage.increment('user-1', 60000, 100, 0, 'default');

    expect(fakeClient.set).toHaveBeenCalledWith(
      'tenant-a:user-1:default',
      '1',
      expect.objectContaining({ NX: true }),
    );
  });

  it('deve incrementar (sem renovar expiração) quando a chave já existe', async () => {
    fakeClient.set.mockResolvedValue(null);
    fakeClient.incr.mockResolvedValue(2);
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment('user-1', 60000, 100, 0, 'default');

    expect(fakeClient.incr).toHaveBeenCalledWith('throttler:user-1:default');
    expect(fakeClient.expire).not.toHaveBeenCalled();
    expect(result.totalHits).toBe(2);
    expect(result.isBlocked).toBe(false);
  });

  it('deve bloquear quando ultrapassar o limite, expirando pelo maior entre ttl e blockDuration', async () => {
    fakeClient.set.mockResolvedValue(null);
    fakeClient.incr.mockResolvedValue(101);
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment(
      'user-1',
      60000,
      100,
      120000,
      'default',
    );

    expect(result.isBlocked).toBe(true);
    expect(result.timeToBlockExpire).toBe(120000);
    expect(fakeClient.expire).toHaveBeenCalledWith(
      'throttler:user-1:default',
      120,
    );
  });

  it('deve manter o ttl quando blockDuration for menor que o ttl', async () => {
    fakeClient.set.mockResolvedValue(null);
    fakeClient.incr.mockResolvedValue(101);
    const storage = new RedisThrottlerStorage();

    await storage.increment('user-1', 60000, 100, 30000, 'default');

    expect(fakeClient.expire).toHaveBeenCalledWith(
      'throttler:user-1:default',
      60,
    );
  });

  it('deve usar o ttl informado quando o Redis não retornar ttl', async () => {
    fakeClient.ttl.mockResolvedValue(-1);
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment('user-1', 45000, 100, 0, 'default');

    expect(result.timeToExpire).toBe(45000);
  });

  it('deve falhar FECHADO (bloquear) quando o Redis lançar erro', async () => {
    fakeClient.set.mockRejectedValueOnce(new Error('Redis down'));
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment(
      'user-1',
      60000,
      100,
      30000,
      'default',
    );

    expect(result).toEqual({
      totalHits: 101,
      timeToExpire: 60000,
      isBlocked: true,
      timeToBlockExpire: 30000,
    });
    expect(console.error).toHaveBeenCalled();
  });
});
