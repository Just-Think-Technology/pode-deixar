// Shared notifications service — single home for dedup, idempotency and rate-limit

import { Injectable } from "@nestjs/common";
import { PrismaService } from "@pode-deixar/prisma";
import { Prisma } from "@prisma/client";
import {
  DEFAULT_DEDUP_TTL_MS,
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  INotificationPort,
  NotificationType,
  NotifyOptions,
} from "./notification.interface";

// --- Service Implementation ---

@Injectable()
export class NotificationsService implements INotificationPort {
  private readonly rateLimitStore = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {}

  // --- Public API ---

  /**
   * Creates a notification with dedup and rate-limit handling.
   * Supports both positional (userId, type, title, message, dedupKey, ttl) and object forms.
   * @param args - Positional or object notification data
   * @returns Created notification or null when duplicate or rate-limited
   */
  async notify(
    userIdOrOptions: string | NotifyOptions,
    type?: NotificationType | string,
    title?: string,
    message?: string,
    dedupKey?: string | null,
    ttl?: number,
  ): Promise<unknown | null> {
    const opts = this.normalizeArgs(
      userIdOrOptions,
      type,
      title,
      message,
      dedupKey,
      ttl,
    );

    if (this.isRateLimited(opts.userId, opts.type as string)) {
      return null;
    }

    const dedupContractId = opts.contractId ?? opts.dedupKey ?? null;
    const dedupConversationId = opts.conversationId ?? null;
    const resolvedTtl = opts.ttl ?? DEFAULT_DEDUP_TTL_MS;

    // If dedup key targets a conversation notification, route it to conversationId
    let finalContractId: string | null = dedupContractId;
    let finalConversationId: string | null = dedupConversationId;
    if (
      opts.type === "CONVERSATION" &&
      dedupContractId &&
      !dedupConversationId
    ) {
      finalConversationId = dedupContractId;
      finalContractId = null;
    }

    const duplicate = await this.existsRecent({
      userId: opts.userId,
      type: opts.type as string,
      title: opts.title,
      contractId: finalContractId,
      conversationId: finalConversationId,
      windowMs: resolvedTtl,
    });

    if (duplicate) {
      return null;
    }

    try {
      return await this.prisma.notification.create({
        data: {
          userId: opts.userId,
          type: opts.type as NotificationType,
          title: opts.title,
          message: opts.message,
          contractId: finalContractId ?? null,
          conversationId: finalConversationId ?? null,
        },
      });
    } catch (error) {
      if (this.isP2002(error)) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Checks if a recent notification exists within the dedup window.
   * @param opts - Dedup lookup options
   * @returns True if duplicate exists
   */
  async existsRecent(opts: {
    userId: string;
    type: string;
    title: string;
    contractId?: string | null;
    conversationId?: string | null;
    windowMs?: number;
  }): Promise<boolean> {
    const windowMs = opts.windowMs ?? DEFAULT_DEDUP_TTL_MS;
    const since = new Date(Date.now() - windowMs);

    const where: Record<string, unknown> = {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      createdAt: { gte: since },
    };

    if (opts.contractId) {
      where.contractId = opts.contractId;
    }

    if (opts.conversationId) {
      where.conversationId = opts.conversationId;
    }

    const existing = await this.prisma.notification.findFirst({
      where,
    });

    return Boolean(existing);
  }

  // --- Private Helpers ---

  private normalizeArgs(
    userIdOrOptions: string | NotifyOptions,
    type?: NotificationType | string,
    title?: string,
    message?: string,
    dedupKey?: string | null,
    ttl?: number,
  ): NotifyOptions {
    if (typeof userIdOrOptions === "object" && userIdOrOptions !== null) {
      return userIdOrOptions as NotifyOptions;
    }

    return {
      userId: userIdOrOptions as string,
      type: type as string,
      title: title as string,
      message: message as string,
      dedupKey: dedupKey ?? null,
      ttl,
    };
  }

  private isRateLimited(userId: string, type: string): boolean {
    const key = `${userId}:${type}`;
    const now = Date.now();
    const windowStart = now - DEFAULT_RATE_LIMIT_WINDOW_MS;

    const timestamps = this.rateLimitStore.get(key) ?? [];
    const recent = timestamps.filter((t) => t > windowStart);

    if (recent.length >= DEFAULT_RATE_LIMIT_MAX) {
      this.rateLimitStore.set(key, recent);
      return true;
    }

    recent.push(now);
    this.rateLimitStore.set(key, recent);
    return false;
  }

  private isP2002(error: unknown): boolean {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return true;
    }
    const code = (error as { code?: string } | null)?.code;
    return code === "P2002";
  }

  /**
   * Clears rate-limit store — exposed for tests.
   */
  clearRateLimit(): void {
    this.rateLimitStore.clear();
  }
}
