// purpose: Error boundary for worker tracking route
"use client";

import { useState } from "react";

import { TrackingError } from "@/components/shared/tracking/tracking-states";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  function handleRetry() {
    setIsRetrying(true);
    reset();
  }

  return <TrackingError message={error.message} onRetry={handleRetry} isRetrying={isRetrying} />;
}
