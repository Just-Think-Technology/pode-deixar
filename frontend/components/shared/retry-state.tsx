// Retry state — generic reload placeholder with friendly error and retry
//
// Generalizes the tracking error pattern for every list/detail screen:
// inline alert, disabled-while-retrying button, responsive layout.

"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type RetryStateProps = {
  title: string;
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
};

/**
 * Shows a loading failure with a retry action. The button disables
 * while retrying to prevent accidental repeated requests.
 *
 * @param title - Short heading in PT-BR
 * @param message - Friendly error message (never technical)
 * @param onRetry - Retry handler
 * @param isRetrying - Disables the button and labels progress
 */
export function RetryState({ title, message, onRetry, isRetrying }: RetryStateProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8" aria-busy={isRetrying}>
      <Alert variant="destructive">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button
        type="button"
        variant="outline"
        className="mt-4 w-full sm:w-auto"
        disabled={isRetrying}
        onClick={onRetry}
      >
        {isRetrying ? "Tentando novamente..." : "Tentar novamente"}
      </Button>
    </div>
  );
}
