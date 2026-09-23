// Review response — worker reply display and form for a received review

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/auth/errors";
import type { ReviewResponse as ReviewResponseData } from "@/lib/worker/reviews/types";
import { MAX_RESPONSE_LENGTH } from "@/lib/worker/reviews/types";
import { formatReviewDate } from "@/lib/client/reviews/mappers";

type ReviewResponseProps = {
  reviewId: string;
  response: ReviewResponseData | null;
  onReply: (reviewId: string, message: string) => Promise<void>;
};

export default function ReviewResponse({
  reviewId,
  response,
  onReply,
}: ReviewResponseProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (response) {
    return (
      <div className="rounded-md bg-muted/50 p-3">
        <p className="mb-1 text-xs font-semibold text-foreground">
          Sua resposta · {formatReviewDate(response.createdAt)}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {response.message}
        </p>
      </div>
    );
  }

  const isOverLimit = message.length > MAX_RESPONSE_LENGTH;
  const canSubmit =
    message.trim().length > 0 && !isOverLimit && !isSending;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await onReply(reviewId, message.trim());
      setMessage("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        placeholder="Escreva sua resposta…"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {message.length}/{MAX_RESPONSE_LENGTH} caracteres
        </span>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isSending ? "Enviando…" : "Responder"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
