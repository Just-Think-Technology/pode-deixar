// Worker reviews section — own received reviews with reply and report actions

"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ReviewsSummary } from "@/lib/client/reviews/types";
import {
  getMyReviewsAction,
  replyToReviewAction,
  reportReviewAction,
} from "@/lib/worker/reviews/actions";
import type {
  MyReview,
  ReportReviewPayload,
} from "@/lib/worker/reviews/types";
import ReportReviewDialog from "./report-review-dialog";
import ReviewCard from "./review-card";
import ReviewResponse from "./review-response";
import ReviewSummary from "./review-summary";

type WorkerReviewsSectionProps = {
  initialSummary: ReviewsSummary;
};

function toSectionError(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function WorkerReviewsSection({
  initialSummary,
}: WorkerReviewsSectionProps) {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setReviews(await getMyReviewsAction());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : toSectionError(err, "Não foi possível carregar as avaliações."),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const handleRetry = useCallback(() => {
    void loadReviews();
  }, [loadReviews]);

  const handleReply = useCallback(
    async (reviewId: string, message: string) => {
      const response = await replyToReviewAction(reviewId, message);

      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId ? { ...review, response } : review,
        ),
      );
    },
    [],
  );

  const handleReport = useCallback(
    async (reviewId: string, payload: ReportReviewPayload) => {
      await reportReviewAction(reviewId, payload);

      setReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? { ...review, reportStatus: "PENDING" as const }
            : review,
        ),
      );
    },
    [],
  );

  const showListError = error !== null && reviews.length === 0 && !isLoading;

  return (
    <section aria-label="Minhas avaliações">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        Minhas avaliações
      </h2>
      <div className="space-y-4">
        <ReviewSummary summary={initialSummary} />

        {showListError ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-5">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                Carregando avaliações…
              </p>
            </CardContent>
          </Card>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                Você ainda não recebeu avaliações.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                response={review.response}
                actions={
                  <>
                    {!review.response && (
                      <ReviewResponse
                        reviewId={review.id}
                        response={null}
                        onReply={handleReply}
                      />
                    )}
                    <div className="flex flex-wrap gap-2">
                      <ReportReviewDialog
                        reviewId={review.id}
                        reportStatus={review.reportStatus}
                        onReport={handleReport}
                      />
                    </div>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
