// Friendly error types — single vocabulary for API error interpretation

export type ErrorCategory =
  | "validation"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "rate-limited"
  | "connection"
  | "server"
  | "unknown";

export type FriendlyError = {
  category: ErrorCategory;
  message: string;
  status: number | null;
  retryable: boolean;
  fieldErrors: Record<string, string> | null;
};

export type ShowApiErrorOptions = {
  action?: string;
};
