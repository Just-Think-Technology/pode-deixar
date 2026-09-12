import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { createClient, RedisClientType } from 'redis';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private client: RedisClientType;
  private prefix: string;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.prefix = process.env.THROTTLER_PREFIX || 'throttler:';
    this.client = createClient({ url });
    this.client.connect().catch((err) => {
      console.error('Redis connection failed:', err);
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const prefixedKey = `${this.prefix}${key}:${throttlerName}`;
    const ttlSecs = Math.ceil(ttl / 1000);

    try {
      // SET NX EX creates the key with its TTL atomically and only increments
      // when the key already exists, avoiding a race on the first hit.
      const created = await this.client.set(prefixedKey, '1', {
        EX: ttlSecs,
        NX: true,
      });
      const current =
        created === 'OK' ? 1 : await this.client.incr(prefixedKey);

      const isBlocked = current > limit;
      let timeToBlockExpire = 0;
      if (isBlocked) {
        timeToBlockExpire = blockDuration;
        if (blockDuration > 0) {
          const blockSecs = Math.ceil(blockDuration / 1000);
          await this.client.expire(
            prefixedKey,
            Math.max(ttlSecs, blockSecs),
          );
        }
      }

      const ttlMs = await this.client.ttl(prefixedKey);
      const timeToExpire = ttlMs > 0 ? ttlMs * 1000 : ttl;

      return {
        totalHits: current,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
      };
    } catch (error) {
      // Fail closed: without Redis there is no hit counting, so block instead
      // of admitting the request without a limit.
      console.error('Redis throttler storage error:', error);
      return {
        totalHits: limit + 1,
        timeToExpire: ttl,
        isBlocked: true,
        timeToBlockExpire: blockDuration,
      };
    }
  }
}