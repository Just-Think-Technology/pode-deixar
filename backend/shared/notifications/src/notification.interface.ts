// Notification port — shared contract for deduped notification creation

// --- Types ---

export type NotificationType = "CONVERSATION" | "SERVICE";

export interface NotifyOptions {
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  dedupKey?: string | null;
  contractId?: string | null;
  conversationId?: string | null;
  ttl?: number;
}

// --- Port Interface ---

/**
 * Port for deduped notification creation.
 * Single authoritative home for existsRecent + P2002 + rate-limit handling.
 */
export interface INotificationPort {
  /**
   * Creates a notification with deduplication and rate-limiting.
   * Signature matches architecture candidate 1: notify(userId, type, title, message, dedupKey, ttl)
   * Also supports object form for ergonomics.
   * @param userId - Recipient user id
   * @param type - Notification type (SERVICE | CONVERSATION)
   * @param title - Deduplication title key
   * @param message - Human-readable message body
   * @param dedupKey - Optional dedup key (maps to contractId / conversationId)
   * @param ttl - Dedup window in ms (default 60000)
   * @returns Created notification or null when duplicate/rate-limited
   */
  notify(
    userId: string,
    type: NotificationType | string,
    title: string,
    message: string,
    dedupKey?: string | null,
    ttl?: number,
  ): Promise<unknown | null>;
  notify(options: NotifyOptions): Promise<unknown | null>;
}

export const NOTIFICATION_PORT = Symbol("NOTIFICATION_PORT");

export const DEFAULT_DEDUP_TTL_MS = 60000;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000;
export const DEFAULT_RATE_LIMIT_MAX = 10;
