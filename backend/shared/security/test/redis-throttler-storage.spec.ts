import { createClient } from 'redis';
import { RedisThrottlerStorage } from '../redis-throttler-storage';

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

  it('should create the client with REDIS_URL and connect', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';

    // The constructor's client creation is the assertion target.
    // eslint-disable-next-line no-new
    new RedisThrottlerStorage();

    expect(mockedCreateClient).toHaveBeenCalledWith({
      url: 'redis://localhost:6379',
    });
    expect(fakeClient.connect).toHaveBeenCalled();
  });

  it('should use the throttler: prefix by default and atomic SET NX EX on the first hit', async () => {
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment('user-1', 60000, 100, 0, 'default');

    expect(fakeClient.set).toHaveBeenCalledWith(
      'throttler:user-1:default',
      '1',
      { EX: 60, NX: true },
    );
    expect(fakeClient.incr).not.toHaveBeenCalled();
    expect(fakeClient.expire).not.toHaveBeenCalled();
    expect(result).toEqual({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it('should respect THROTTLER_PREFIX when configured', async () => {
    process.env.THROTTLER_PREFIX = 'tenant-a:';
    const storage = new RedisThrottlerStorage();

    await storage.increment('user-1', 60000, 100, 0, 'default');

    expect(fakeClient.set).toHaveBeenCalledWith(
      'tenant-a:user-1:default',
      '1',
      expect.objectContaining({ NX: true }),
    );
  });

  it('should increment (without renewing expiration) when the key already exists', async () => {
    fakeClient.set.mockResolvedValue(null);
    fakeClient.incr.mockResolvedValue(2);
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment('user-1', 60000, 100, 0, 'default');

    expect(fakeClient.incr).toHaveBeenCalledWith('throttler:user-1:default');
    expect(fakeClient.expire).not.toHaveBeenCalled();
    expect(result.totalHits).toBe(2);
    expect(result.isBlocked).toBe(false);
  });

  it('should block when exceeding the limit, expiring with the greater of ttl and blockDuration', async () => {
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

  it('should keep the ttl when blockDuration is shorter than the ttl', async () => {
    fakeClient.set.mockResolvedValue(null);
    fakeClient.incr.mockResolvedValue(101);
    const storage = new RedisThrottlerStorage();

    await storage.increment('user-1', 60000, 100, 30000, 'default');

    expect(fakeClient.expire).toHaveBeenCalledWith(
      'throttler:user-1:default',
      60,
    );
  });

  it('should use the given ttl when Redis returns no ttl', async () => {
    fakeClient.ttl.mockResolvedValue(-1);
    const storage = new RedisThrottlerStorage();

    const result = await storage.increment('user-1', 45000, 100, 0, 'default');

    expect(result.timeToExpire).toBe(45000);
  });

  it('should fail CLOSED (block) when Redis throws an error', async () => {
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
