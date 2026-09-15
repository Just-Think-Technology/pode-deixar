// Redis throttler storage — distributed rate-limit backend

import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { createClient, RedisClientType } from 'redis';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

const MS_PER_SECOND = 1000;

function toSeconds(ms: number): number {
  return Math.ceil(ms / MS_PER_SECOND);
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
    const ttlSecs = toSeconds(ttl);

    try {
      const current = await this.recordHit(prefixedKey, ttlSecs);
      const timeToBlockExpire = await this.applyBlock(
        prefixedKey,
        current,
        limit,
        ttlSecs,
        blockDuration,
      );
      const timeToExpire = await this.readExpiry(prefixedKey, ttl);

      return {
        totalHits: current,
        timeToExpire,
        isBlocked: current > limit,
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

  // SET NX EX creates the key with its TTL atomically and only increments
  // when the key already exists, avoiding a race on the first hit.
  private async recordHit(
    prefixedKey: string,
    ttlSecs: number,
  ): Promise<number> {
    const created = await this.client.set(prefixedKey, '1', {
      EX: ttlSecs,
      NX: true,
    });
    return created === 'OK' ? 1 : this.client.incr(prefixedKey);
  }

  private async applyBlock(
    prefixedKey: string,
    current: number,
    limit: number,
    ttlSecs: number,
    blockDuration: number,
  ): Promise<number> {
    if (current <= limit) {
      return 0;
    }
    if (blockDuration > 0) {
      const blockSecs = toSeconds(blockDuration);
      await this.client.expire(prefixedKey, Math.max(ttlSecs, blockSecs));
    }
    return blockDuration;
  }

  private async readExpiry(
    prefixedKey: string,
    ttl: number,
  ): Promise<number> {
    const ttlMs = await this.client.ttl(prefixedKey);
    return ttlMs > 0 ? ttlMs * MS_PER_SECOND : ttl;
  }
}
