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
  private prefix = 'throttler:';

  constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
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

    try {
      const current = await this.client.incr(prefixedKey);
      if (current === 1) {
        await this.client.expire(prefixedKey, Math.ceil(ttl / 1000));
      }

      const ttlMs = await this.client.ttl(prefixedKey);
      const timeToExpire = ttlMs > 0 ? ttlMs * 1000 : ttl;

      return {
        totalHits: current,
        timeToExpire,
        isBlocked: current > limit,
        timeToBlockExpire: current > limit ? blockDuration : 0,
      };
    } catch {
      return {
        totalHits: 1,
        timeToExpire: ttl,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}