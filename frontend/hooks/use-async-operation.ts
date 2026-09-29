// Async operation hook — loading, error and retry state for API actions
//
// Centralizes the submit/mutate pattern so screens don't reinvent
// isLoading guards: concurrent executions are ignored, actions disable
// while pending, and errors resolve to friendly messages.

"use client";

import { useCallback, useRef, useState } from "react";

import { getFriendlyMessage } from "@/lib/errors";

// --- Hook interface ---

export type UseAsyncOperation = {
  isLoading: boolean;
  error: string | null;
  execute: <T>(operation: () => Promise<T>) => Promise<T | null>;
  retry: () => Promise<unknown>;
  reset: () => void;
};

/**
 * Owns loading/error state for one async user action. While pending,
 * further execute calls are ignored to prevent accidental double
 * submits. Failures resolve to friendly PT-BR messages; the raw error
 * stays in dev logs only.
 *
 * @returns Operation state with execute, retry and reset
 */
export function useAsyncOperation(): UseAsyncOperation {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);
  const lastOperationRef = useRef<(() => Promise<unknown>) | null>(null);

  const execute = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | null> => {
      if (runningRef.current) return null;
      runningRef.current = true;
      lastOperationRef.current = operation as () => Promise<unknown>;
      setIsLoading(true);
      setError(null);
      try {
        return await operation();
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[use-async-operation]", err);
        }
        setError(getFriendlyMessage(err));
        return null;
      } finally {
        runningRef.current = false;
        setIsLoading(false);
      }
    },
    [],
  );

  const retry = useCallback(async (): Promise<unknown> => {
    const last = lastOperationRef.current;
    if (!last || runningRef.current) return null;
    return execute(last);
  }, [execute]);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return { isLoading, error, execute, retry, reset };
}
